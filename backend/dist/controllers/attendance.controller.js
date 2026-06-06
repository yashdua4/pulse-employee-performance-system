"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceLogs = exports.getTodayStatus = exports.clockOut = exports.clockIn = void 0;
const client_1 = require("@prisma/client");
const audit_js_1 = require("../utils/audit.js");
const prisma = new client_1.PrismaClient();
// Helper to get local date representation as start-of-day UTC
const getTodayLocalDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const clockIn = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const employeeId = req.user.employeeId;
        const today = getTodayLocalDate();
        // Check if already clocked in today
        const existing = await prisma.attendance.findUnique({
            where: {
                employeeId_date: { employeeId, date: today },
            },
        });
        if (existing) {
            return res.status(400).json({ message: 'Already clocked in today' });
        }
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { department: true },
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }
        // IP Whitelist verification
        if (employee.department && employee.department.allowedIps) {
            const whitelist = employee.department.allowedIps
                .split(',')
                .map((ip) => ip.trim())
                .filter(Boolean);
            if (whitelist.length > 0) {
                // Resolve client IP address
                const rawIp = (req.headers['x-forwarded-for'] ||
                    req.socket.remoteAddress ||
                    req.ip ||
                    '').trim();
                const clientIp = rawIp.replace(/^.*:/, ''); // clean IPv6 prefix (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
                const isAllowed = whitelist.some((ip) => {
                    const cleanWhitelistedIp = ip.trim().replace(/^.*:/, '');
                    return (clientIp === cleanWhitelistedIp ||
                        (clientIp === '1' && cleanWhitelistedIp === '127.0.0.1') ||
                        clientIp === '127.0.0.1' ||
                        clientIp === '::1' ||
                        clientIp === 'localhost');
                });
                if (!isAllowed) {
                    return res.status(403).json({
                        message: `Clock-in blocked: unauthorized IP address (${clientIp}). Whitelist restricts access to designated network locations.`
                    });
                }
            }
        }
        const clockInTime = new Date();
        // Check if late (starts at 9:00 AM, grace period until 9:30 AM)
        const threshold = new Date();
        threshold.setHours(9, 30, 0, 0);
        let status = client_1.AttendanceStatus.PRESENT;
        if (clockInTime > threshold) {
            status = client_1.AttendanceStatus.LATE;
        }
        // Check if employee has approved leave request today
        const leave = await prisma.leaveRequest.findFirst({
            where: {
                employeeId,
                status: 'APPROVED',
                startDate: { lte: clockInTime },
                endDate: { gte: clockInTime },
            },
        });
        if (leave) {
            status = client_1.AttendanceStatus.LEAVE;
        }
        const record = await prisma.attendance.create({
            data: {
                employeeId,
                date: today,
                clockIn: clockInTime,
                status,
            },
        });
        // Create AttendanceLog
        await prisma.attendanceLog.create({
            data: {
                attendanceId: record.id,
                action: 'CLOCK_IN',
                timestamp: clockInTime,
                ipAddress: req.ip,
            },
        });
        // Write Audit Log
        await (0, audit_js_1.logAction)(req.user.id, 'ATTENDANCE_CLOCK_IN', null, { id: record.id, status });
        return res.status(201).json(record);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error clocking in', error: error.message });
    }
};
exports.clockIn = clockIn;
const clockOut = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const employeeId = req.user.employeeId;
        const today = getTodayLocalDate();
        // Find today's clock in
        const record = await prisma.attendance.findUnique({
            where: {
                employeeId_date: { employeeId, date: today },
            },
        });
        if (!record) {
            return res.status(400).json({ message: 'No clock-in record found for today' });
        }
        if (record.clockOut) {
            return res.status(400).json({ message: 'Already clocked out today' });
        }
        const clockOutTime = new Date();
        const diffMs = clockOutTime.getTime() - record.clockIn.getTime();
        const workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // 2 decimal places
        const updatedRecord = await prisma.attendance.update({
            where: { id: record.id },
            data: {
                clockOut: clockOutTime,
                workHours,
            },
        });
        // Create AttendanceLog
        await prisma.attendanceLog.create({
            data: {
                attendanceId: record.id,
                action: 'CLOCK_OUT',
                timestamp: clockOutTime,
                ipAddress: req.ip,
            },
        });
        // Write Audit Log
        await (0, audit_js_1.logAction)(req.user.id, 'ATTENDANCE_CLOCK_OUT', { id: record.id }, { workHours });
        return res.json(updatedRecord);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error clocking out', error: error.message });
    }
};
exports.clockOut = clockOut;
const getTodayStatus = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const employeeId = req.user.employeeId;
        const today = getTodayLocalDate();
        const record = await prisma.attendance.findUnique({
            where: {
                employeeId_date: { employeeId, date: today },
            },
            include: { logs: true },
        });
        return res.json(record || null);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error getting today status', error: error.message });
    }
};
exports.getTodayStatus = getTodayStatus;
const getAttendanceLogs = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { role, employeeId } = req.user;
        const { departmentId, employeeId: targetEmployeeId } = req.query;
        let logs = [];
        if (role === client_1.Role.ADMIN) {
            const whereClause = {};
            if (targetEmployeeId)
                whereClause.employeeId = targetEmployeeId;
            if (departmentId) {
                whereClause.employee = { departmentId: departmentId };
            }
            logs = await prisma.attendance.findMany({
                where: whereClause,
                include: {
                    employee: {
                        include: { department: true },
                    },
                    logs: true,
                },
                orderBy: { date: 'desc' },
            });
        }
        else if (role === client_1.Role.MANAGER && employeeId) {
            // Managers see team + self
            const subordinates = await prisma.employee.findMany({
                where: { managerId: employeeId },
                select: { id: true },
            });
            const subordinateIds = subordinates.map((s) => s.id);
            const whereClause = {
                employeeId: { in: [...subordinateIds, employeeId] },
            };
            if (targetEmployeeId && [...subordinateIds, employeeId].includes(targetEmployeeId)) {
                whereClause.employeeId = targetEmployeeId;
            }
            logs = await prisma.attendance.findMany({
                where: whereClause,
                include: {
                    employee: {
                        include: { department: true },
                    },
                    logs: true,
                },
                orderBy: { date: 'desc' },
            });
        }
        else if (employeeId) {
            // Employees see self
            logs = await prisma.attendance.findMany({
                where: { employeeId },
                include: {
                    employee: {
                        include: { department: true },
                    },
                    logs: true,
                },
                orderBy: { date: 'desc' },
            });
        }
        else {
            logs = [];
        }
        return res.json(logs);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving attendance logs', error: error.message });
    }
};
exports.getAttendanceLogs = getAttendanceLogs;
