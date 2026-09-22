import { Prisma, Role, SuspiciousSeverity } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { getBrowserName, getClientIp, getDeviceName, getUserAgent } from './request.js';

type PrismaLike = Prisma.TransactionClient | typeof prisma;

interface SuspiciousActivityInput {
  userId?: string | null;
  type: string;
  description: string;
  severity?: SuspiciousSeverity;
  metadata?: Prisma.InputJsonValue;
  req?: Request;
  prismaClient?: PrismaLike;
}

interface DataAccessInput {
  viewerId?: string | null;
  viewerEmail?: string | null;
  resource: string;
  resourceId: string;
  metadata?: Prisma.InputJsonValue;
  prismaClient?: PrismaLike;
}

interface SessionInput {
  userId: string;
  req: Request;
  prismaClient?: PrismaLike;
}

export const createSuspiciousActivity = async ({
  userId,
  type,
  description,
  severity = SuspiciousSeverity.MEDIUM,
  metadata,
  req,
  prismaClient = prisma,
}: SuspiciousActivityInput) => {
  try {
    await prismaClient.suspiciousActivity.create({
      data: {
        userId: userId || null,
        type,
        description,
        severity,
        ipAddress: req ? getClientIp(req) : null,
        userAgent: req ? getUserAgent(req) : null,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to record suspicious activity:', error);
  }
};

export const recordDataAccess = async ({
  viewerId,
  viewerEmail,
  resource,
  resourceId,
  metadata,
  prismaClient = prisma,
}: DataAccessInput) => {
  try {
    await prismaClient.dataAccessLog.create({
      data: {
        viewerId: viewerId || null,
        viewerEmail: viewerEmail || null,
        resource,
        resourceId,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to record data access:', error);
  }
};

export const createSession = async ({
  userId,
  req,
  prismaClient = prisma,
}: SessionInput) => {
  const userAgent = getUserAgent(req);
  const browser = getBrowserName(userAgent);
  const deviceName = getDeviceName(userAgent);
  const ipAddress = getClientIp(req);

  const session = await prismaClient.userSession.create({
    data: {
      userId,
      browser,
      deviceName,
      ipAddress,
      userAgent,
      lastActivity: new Date(),
    },
  });

  const recentSessions = await prismaClient.userSession.findMany({
    where: {
      userId,
      revoked: false,
      id: { not: session.id },
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      ipAddress: true,
      deviceName: true,
      browser: true,
    },
  });

  const uniqueIps = new Set(recentSessions.map((item) => item.ipAddress).filter(Boolean));
  const isUnknownDevice = !recentSessions.some(
    (item) => item.browser === browser && item.deviceName === deviceName
  );

  if (uniqueIps.size >= 2 && !uniqueIps.has(ipAddress)) {
    await createSuspiciousActivity({
      userId,
      type: 'IP_CHANGE_BURST',
      description: 'Multiple IP changes detected in a short period.',
      severity: SuspiciousSeverity.HIGH,
      metadata: {
        ipAddress,
        previousIps: Array.from(uniqueIps),
      },
      req,
      prismaClient,
    });
  }

  if (isUnknownDevice && recentSessions.length > 0) {
    await createSuspiciousActivity({
      userId,
      type: 'UNKNOWN_DEVICE_LOGIN',
      description: 'Login from a device/browser combination not seen recently.',
      severity: SuspiciousSeverity.MEDIUM,
      metadata: {
        browser,
        deviceName,
      },
      req,
      prismaClient,
    });
  }

  return session;
};

export const touchSession = async (sessionId?: string) => {
  if (!sessionId) return;
  try {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
      },
    });
  } catch (error) {
    // Ignore stale or revoked sessions here to avoid blocking requests.
  }
};

export const revokeSession = async (sessionId: string, userId?: string) => {
  const session = await prisma.userSession.findFirst({
    where: {
      id: sessionId,
      ...(userId ? { userId } : {}),
    },
  });

  if (!session) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userSession.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    await tx.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });

  return session;
};

export const revokeAllSessionsForUser = async (userId: string, exceptSessionId?: string) => {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: {
        userId,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: now,
      },
    });

    await tx.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { sessionId: { not: exceptSessionId } } : {}),
      },
      data: {
        revokedAt: now,
      },
    });
  });
};

export const permissionMatrix = [
  {
    permission: 'Create Employee',
    admin: true,
    manager: false,
    employee: false,
  },
  {
    permission: 'Delete Employee',
    admin: true,
    manager: false,
    employee: false,
  },
  {
    permission: 'Assign Project',
    admin: true,
    manager: true,
    employee: false,
  },
  {
    permission: 'Approve Leave',
    admin: true,
    manager: true,
    employee: false,
  },
  {
    permission: 'View Reports',
    admin: true,
    manager: true,
    employee: false,
  },
  {
    permission: 'View Audit Logs',
    admin: true,
    manager: false,
    employee: false,
  },
  {
    permission: 'Manage MFA',
    admin: true,
    manager: true,
    employee: true,
  },
  {
    permission: 'Manage Sessions',
    admin: true,
    manager: true,
    employee: true,
  },
];

export const canAccessAdminSecurity = (role: Role) => role === Role.ADMIN;
