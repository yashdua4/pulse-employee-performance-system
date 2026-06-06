"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const logAction = async (userId, action, previousValue = null, newValue = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                previousValue: previousValue ? JSON.stringify(previousValue) : null,
                newValue: newValue ? JSON.stringify(newValue) : null,
            },
        });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
};
exports.logAction = logAction;
