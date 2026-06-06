import { z } from 'zod';
import { LeaveType } from '@prisma/client';

export const applyLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType).optional(),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  reason: z.string().min(5, 'Reason must be at least 5 characters long').max(500),
});
