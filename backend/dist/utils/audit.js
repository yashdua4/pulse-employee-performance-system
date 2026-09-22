"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = void 0;
const prisma_js_1 = require("../lib/prisma.js");
const request_js_1 = require("./request.js");
const logAction = async (userId, action, previousValue = null, newValue = null, context = {}) => {
    const prismaClient = context.prismaClient || prisma_js_1.prisma;
    try {
        await prismaClient.auditLog.create({
            data: {
                userId: userId || null,
                userEmail: context.userEmail || null,
                action,
                targetEntity: context.targetEntity || null,
                targetId: context.targetId || null,
                ipAddress: context.req ? (0, request_js_1.getClientIp)(context.req) : null,
                userAgent: context.req ? (0, request_js_1.getUserAgent)(context.req) : null,
                previousValue: previousValue ? JSON.stringify(previousValue) : null,
                newValue: newValue ? JSON.stringify(newValue) : null,
                metadata: context.metadata,
            },
        });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
};
exports.logAction = logAction;
