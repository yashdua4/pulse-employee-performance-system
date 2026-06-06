import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logAction = async (
  userId: string | null | undefined,
  action: string,
  previousValue: any = null,
  newValue: any = null
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
