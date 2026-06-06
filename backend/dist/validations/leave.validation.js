"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLeaveSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.applyLeaveSchema = zod_1.z.object({
    leaveType: zod_1.z.nativeEnum(client_1.LeaveType).optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.string().date()),
    endDate: zod_1.z.string().datetime().or(zod_1.z.string().date()),
    reason: zod_1.z.string().min(5, 'Reason must be at least 5 characters long').max(500),
});
