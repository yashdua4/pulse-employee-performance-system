"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReviewSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createReviewSchema = zod_1.z.object({
    revieweeId: zod_1.z.string().uuid('Invalid employee ID'),
    period: zod_1.z.string().min(2, 'Period must be specified (e.g. Q1 2026)'),
    technicalSkills: zod_1.z.number().int().min(1).max(5),
    communication: zod_1.z.number().int().min(1).max(5),
    teamwork: zod_1.z.number().int().min(1).max(5),
    problemSolving: zod_1.z.number().int().min(1).max(5),
    leadership: zod_1.z.number().int().min(1).max(5),
    feedback: zod_1.z.string().min(5, 'Feedback must be at least 5 characters long'),
    goals: zod_1.z.string().or(zod_1.z.array(zod_1.z.string())).optional(),
    status: zod_1.z.nativeEnum(client_1.ReviewStatus).optional(),
});
exports.updateReviewSchema = zod_1.z.object({
    period: zod_1.z.string().min(2).optional(),
    technicalSkills: zod_1.z.number().int().min(1).max(5).optional(),
    communication: zod_1.z.number().int().min(1).max(5).optional(),
    teamwork: zod_1.z.number().int().min(1).max(5).optional(),
    problemSolving: zod_1.z.number().int().min(1).max(5).optional(),
    leadership: zod_1.z.number().int().min(1).max(5).optional(),
    feedback: zod_1.z.string().min(5).optional(),
    goals: zod_1.z.string().or(zod_1.z.array(zod_1.z.string())).optional(),
    status: zod_1.z.nativeEnum(client_1.ReviewStatus).optional(),
});
