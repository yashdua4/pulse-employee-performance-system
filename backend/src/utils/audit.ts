import { Prisma, PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { getClientIp, getUserAgent } from './request.js';

type PrismaLike = Prisma.TransactionClient | PrismaClient;

interface AuditContext {
  req?: Request;
  userEmail?: string | null;
  targetEntity?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  prismaClient?: PrismaLike;
}

export const logAction = async (
  userId: string | null | undefined,
  action: string,
  previousValue: unknown = null,
  newValue: unknown = null,
  context: AuditContext = {}
) => {
  const prismaClient = context.prismaClient || prisma;

  try {
    await prismaClient.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: context.userEmail || null,
        action,
        targetEntity: context.targetEntity || null,
        targetId: context.targetId || null,
        ipAddress: context.req ? getClientIp(context.req) : null,
        userAgent: context.req ? getUserAgent(context.req) : null,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        metadata: context.metadata,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
