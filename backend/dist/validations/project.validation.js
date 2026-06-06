"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskSchema = exports.createTaskSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Project name must be at least 2 characters'),
    description: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(client_1.ProjectStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.ProjectPriority).optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).optional(),
    endDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).nullable().optional(),
    managerId: zod_1.z.string().uuid('Invalid Manager employee ID'),
    memberIds: zod_1.z.array(zod_1.z.string().uuid('Invalid employee ID')).optional(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(client_1.ProjectStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.ProjectPriority).optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).optional(),
    endDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).nullable().optional(),
    managerId: zod_1.z.string().uuid().optional(),
    memberIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Task title must be at least 2 characters'),
    description: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    dueDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).nullable().optional(),
    assigneeId: zod_1.z.string().uuid().nullable().optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    dueDate: zod_1.z.string().datetime().or(zod_1.z.string().date()).nullable().optional(),
    assigneeId: zod_1.z.string().uuid().nullable().optional(),
});
