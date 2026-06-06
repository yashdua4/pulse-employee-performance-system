import { z } from 'zod';
import { ProjectStatus, ProjectPriority, TaskStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  endDate: z.string().datetime().or(z.string().date()).nullable().optional(),
  managerId: z.string().uuid('Invalid Manager employee ID'),
  memberIds: z.array(z.string().uuid('Invalid employee ID')).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  endDate: z.string().datetime().or(z.string().date()).nullable().optional(),
  managerId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().or(z.string().date()).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().or(z.string().date()).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});
