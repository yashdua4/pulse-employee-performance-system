import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import * as XLSX from 'xlsx';
import { Role, SuspiciousSeverity } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { securityConfig } from '../config/security.js';
import { decryptText, encryptText } from '../utils/crypto.js';
import { logAction } from '../utils/audit.js';
import {
  createSuspiciousActivity,
  permissionMatrix,
  revokeAllSessionsForUser,
  revokeSession,
} from '../utils/security.js';

const formatDateLabel = (value: Date | string) =>
  new Date(value).toISOString().slice(0, 10);

const stringifyValue = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value ?? {});

const escapeCsv = (value: unknown) => {
  const stringValue = stringifyValue(value).replace(/"/g, '""');
  return `"${stringValue}"`;
};

const renderPdfBuffer = async (title: string, rows: Record<string, unknown>[]) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title);
    doc.moveDown();

    rows.forEach((row, index) => {
      doc.fontSize(11).text(`${index + 1}.`);
      Object.entries(row).forEach(([key, value]) => {
        doc.fontSize(9).text(`${key}: ${stringifyValue(value)}`);
      });
      doc.moveDown(0.75);
    });

    doc.end();
  });

const buildExportPayload = async (type: string) => {
  switch (type) {
    case 'audit':
      return prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
    case 'suspicious':
      return prisma.suspiciousActivity.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    case 'sessions':
      return prisma.userSession.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    default:
      throw new Error('Unsupported export type');
  }
};

export const getSecurityDashboard = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [failedLoginAttemptsToday, lockedAccounts, activeSessions, totalAuditEvents, suspiciousActivities, usersWithMfaEnabled] =
      await Promise.all([
        prisma.auditLog.count({
          where: {
            action: 'LOGIN_FAILED',
            timestamp: { gte: today },
          },
        }),
        prisma.user.count({
          where: {
            lockoutUntil: {
              gt: new Date(),
            },
            deletedAt: null,
          },
        }),
        prisma.userSession.count({
          where: {
            revoked: false,
          },
        }),
        prisma.auditLog.count(),
        prisma.suspiciousActivity.count({
          where: {
            resolved: false,
          },
        }),
        prisma.user.count({
          where: {
            mfaEnabled: true,
            deletedAt: null,
          },
        }),
      ]);

    const [failedLoginsByDay, auditEventsTimeline, sessionActivity] = await Promise.all([
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "timestamp") AS day, COUNT(*)::bigint AS count
        FROM "AuditLog"
        WHERE "action" = 'LOGIN_FAILED'
          AND "timestamp" >= NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "timestamp") AS day, COUNT(*)::bigint AS count
        FROM "AuditLog"
        WHERE "timestamp" >= NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "UserSession"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const recentSuspiciousActivities = await prisma.suspiciousActivity.findMany({
      include: {
        user: {
          select: {
            email: true,
            employee: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      cards: {
        failedLoginAttemptsToday,
        lockedAccounts,
        activeSessions,
        totalAuditEvents,
        suspiciousActivities,
        usersWithMfaEnabled,
      },
      charts: {
        failedLoginsByDay: failedLoginsByDay.map((item) => ({
          day: formatDateLabel(item.day),
          count: Number(item.count),
        })),
        auditEventsTimeline: auditEventsTimeline.map((item) => ({
          day: formatDateLabel(item.day),
          count: Number(item.count),
        })),
        sessionActivity: sessionActivity.map((item) => ({
          day: formatDateLabel(item.day),
          count: Number(item.count),
        })),
      },
      suspiciousActivities: recentSuspiciousActivities,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving security dashboard', error: error.message });
  }
};

export const getSuspiciousActivities = async (req: Request, res: Response) => {
  try {
    const { severity, resolved, page, limit } = req.query;
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity as SuspiciousSeverity;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const [items, total] = await Promise.all([
      prisma.suspiciousActivity.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              employee: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.suspiciousActivity.count({ where }),
    ]);

    return res.json({
      items,
      meta: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving suspicious activities', error: error.message });
  }
};

export const getDataAccessLogs = async (req: Request, res: Response) => {
  try {
    const { resource, search, page, limit } = req.query;
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;

    const where: any = {};
    if (resource) where.resource = resource;
    if (search) {
      where.OR = [
        { viewerEmail: { contains: search as string, mode: 'insensitive' } },
        { resourceId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.dataAccessLog.findMany({
        where,
        include: {
          viewer: {
            select: {
              email: true,
              employee: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.dataAccessLog.count({ where }),
    ]);

    return res.json({
      items,
      meta: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving data access logs', error: error.message });
  }
};

export const getSecurityStatus = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      helmetStatus: securityConfig.helmetEnabled,
      rateLimitingStatus: securityConfig.rateLimitingEnabled,
      secureCookiesStatus: securityConfig.secureCookies,
      jwtStatus: securityConfig.jwtEnabled,
      auditLoggingStatus: securityConfig.auditLoggingEnabled,
      databaseStatus: securityConfig.databaseEnabled,
      mfaStatus: securityConfig.mfaEnabled,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving security status', error: error.message });
  }
};

export const getPermissionMatrix = async (_req: Request, res: Response) => {
  return res.json(permissionMatrix);
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: { lastActivity: 'desc' },
    });

    return res.json(
      sessions.map((session) => ({
        ...session,
        isCurrent: session.id === req.user?.sessionId,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving sessions', error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = await revokeSession(req.params.id, req.user.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await logAction(req.user.id, 'SESSION_REVOKE', null, { sessionId: req.params.id }, {
      req,
      targetEntity: 'UserSession',
      targetId: req.params.id,
      userEmail: req.user.email,
    });

    return res.json({
      message: 'Session revoked successfully',
      revokedCurrentSession: req.user.sessionId === req.params.id,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error revoking session', error: error.message });
  }
};

export const logoutAllSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await revokeAllSessionsForUser(req.user.id);
    await logAction(req.user.id, 'SESSION_LOGOUT_ALL', null, { userId: req.user.id }, {
      req,
      targetEntity: 'User',
      targetId: req.user.id,
      userEmail: req.user.email,
    });

    return res.json({ message: 'All sessions revoked successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error revoking all sessions', error: error.message });
  }
};

export const setupMfa = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `Pulse (${user.email})`,
      issuer: 'Pulse HRMS',
      length: 20,
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mfaSecret: encryptText(secret.base32),
        mfaEnabled: false,
      },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || secret.base32);

    return res.json({
      qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error starting MFA setup', error: error.message });
  }
};

export const verifyMfa = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'OTP token is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        mfaSecret: true,
      },
    });

    if (!user?.mfaSecret) {
      return res.status(400).json({ message: 'MFA secret not initialized' });
    }

    const secret = decryptText(user.mfaSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      await createSuspiciousActivity({
        userId: req.user.id,
        type: 'MFA_VERIFICATION_FAILED',
        description: 'Invalid TOTP code submitted during MFA verification.',
        severity: SuspiciousSeverity.MEDIUM,
        req,
      });
      return res.status(400).json({ message: 'Invalid OTP token' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mfaEnabled: true,
      },
    });

    await logAction(req.user.id, 'MFA_ENABLE', null, { enabled: true }, {
      req,
      targetEntity: 'User',
      targetId: req.user.id,
      userEmail: user.email,
    });

    return res.json({ message: 'MFA enabled successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error verifying MFA', error: error.message });
  }
};

export const disableMfa = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        mfaSecret: true,
        mfaEnabled: true,
      },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA is not enabled on this account' });
    }

    if (!token) {
      return res.status(400).json({ message: 'OTP token is required to disable MFA' });
    }

    const secret = decryptText(user.mfaSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP token' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await logAction(req.user.id, 'MFA_DISABLE', null, { enabled: false }, {
      req,
      targetEntity: 'User',
      targetId: req.user.id,
      userEmail: user.email,
    });

    return res.json({ message: 'MFA disabled successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error disabling MFA', error: error.message });
  }
};

export const exportSecurityReport = async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || '');
    const format = String(req.query.format || '').toLowerCase();

    if (!['audit', 'suspicious', 'sessions'].includes(type)) {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'Invalid export format' });
    }

    const rows = await buildExportPayload(type);
    const normalizedRows = rows.map((row: any) => ({
      ...row,
      user: row.user?.email || null,
      metadata: row.metadata ? stringifyValue(row.metadata) : null,
    }));

    if (format === 'csv') {
      const headers = Object.keys(normalizedRows[0] || { type: '', createdAt: '' });
      const csv = [headers.join(',')]
        .concat(
          normalizedRows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${type}-report.xlsx"`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    const buffer = await renderPdfBuffer(`${type.toUpperCase()} Report`, normalizedRows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error exporting security report', error: error.message });
  }
};

export const getSecuritySummary = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [sessionCount, activeSuspiciousEvents, accessLogs, mfaUser] = await Promise.all([
      prisma.userSession.count({
        where: { userId: req.user.id, revoked: false },
      }),
      prisma.suspiciousActivity.count({
        where: { userId: req.user.id, resolved: false },
      }),
      prisma.dataAccessLog.findMany({
        where: { viewerId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { mfaEnabled: true },
      }),
    ]);

    return res.json({
      sessionCount,
      activeSuspiciousEvents,
      mfaEnabled: Boolean(mfaUser?.mfaEnabled),
      recentAccessLogs: accessLogs,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving security summary', error: error.message });
  }
};
