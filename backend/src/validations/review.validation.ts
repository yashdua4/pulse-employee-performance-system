import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';

export const createReviewSchema = z.object({
  revieweeId: z.string().uuid('Invalid employee ID'),
  period: z.string().min(2, 'Period must be specified (e.g. Q1 2026)'),
  technicalSkills: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  teamwork: z.number().int().min(1).max(5),
  problemSolving: z.number().int().min(1).max(5),
  leadership: z.number().int().min(1).max(5),
  feedback: z.string().min(5, 'Feedback must be at least 5 characters long'),
  goals: z.string().or(z.array(z.string())).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
});

export const updateReviewSchema = z.object({
  period: z.string().min(2).optional(),
  technicalSkills: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  teamwork: z.number().int().min(1).max(5).optional(),
  problemSolving: z.number().int().min(1).max(5).optional(),
  leadership: z.number().int().min(1).max(5).optional(),
  feedback: z.string().min(5).optional(),
  goals: z.string().or(z.array(z.string())).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
});
