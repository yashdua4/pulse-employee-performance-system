import { z } from 'zod';
import { Role, EmploymentStatus } from '@prisma/client';

export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designation: z.string().min(2).max(100).nullable().optional(),
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  dateOfJoining: z.string().datetime().or(z.string().date()).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designation: z.string().min(2).max(100).nullable().optional(),
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  employmentStatus: z.nativeEnum(EmploymentStatus).optional(),
  dateOfJoining: z.string().datetime().or(z.string().date()).optional(),
});
