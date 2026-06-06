"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createEmployeeSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    role: zod_1.z.nativeEnum(client_1.Role).optional(),
    departmentId: zod_1.z.string().uuid().nullable().optional(),
    designation: zod_1.z.string().min(2).max(100).nullable().optional(),
    contactNumber: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').nullable().optional(),
    managerId: zod_1.z.string().uuid().nullable().optional(),
    dateOfJoining: zod_1.z.string().datetime().or(zod_1.z.string().date()).optional(),
});
exports.updateEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: zod_1.z.string().email('Invalid email address').optional(),
    role: zod_1.z.nativeEnum(client_1.Role).optional(),
    departmentId: zod_1.z.string().uuid().nullable().optional(),
    designation: zod_1.z.string().min(2).max(100).nullable().optional(),
    contactNumber: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').nullable().optional(),
    managerId: zod_1.z.string().uuid().nullable().optional(),
    employmentStatus: zod_1.z.nativeEnum(client_1.EmploymentStatus).optional(),
    dateOfJoining: zod_1.z.string().datetime().or(zod_1.z.string().date()).optional(),
});
