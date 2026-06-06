"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(notifications);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving notifications', error: error.message });
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notif = await prisma.notification.findUnique({ where: { id } });
        if (!notif) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        if (notif.userId !== req.user?.id) {
            return res.status(403).json({ message: 'Forbidden: You cannot access this notification' });
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error marking notification read', error: error.message });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        return res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error marking all notifications read', error: error.message });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
