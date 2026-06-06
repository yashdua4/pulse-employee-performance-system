"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaveBalances = exports.getLeaveRequests = exports.rejectLeave = exports.approveLeave = exports.cancelLeave = exports.applyLeave = void 0;
const client_1 = require("@prisma/client");
const audit_js_1 = require("../utils/audit.js");
const prisma = new client_1.PrismaClient();
// Helper to notify
const createNotification = async (userId, title, message, type) => {
    try {
        await prisma.notification.create({
            data: { userId, title, message, type },
        });
    }
    catch (err) {
        console.error('Failed to notify:', err);
    }
};
const applyLeave = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { leaveType, startDate, endDate, reason } = req.body;
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ message: 'Start date, end date, and reason are required' });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            return res.status(400).json({ message: 'Start date cannot be after end date' });
        }
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 90) {
            return res.status(400).json({ message: 'Leave request span cannot exceed 90 days per application' });
        }
        const employee = await prisma.employee.findUnique({
            where: { id: req.user.employeeId },
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }
        const lType = leaveType || client_1.LeaveType.CASUAL;
        // Check balances
        if (lType === client_1.LeaveType.CASUAL && employee.casualBalance < diffDays) {
            return res.status(400).json({ message: `Insufficient Casual leave balance. Available: ${employee.casualBalance}, Requested: ${diffDays}` });
        }
        if (lType === client_1.LeaveType.SICK && employee.sickBalance < diffDays) {
            return res.status(400).json({ message: `Insufficient Sick leave balance. Available: ${employee.sickBalance}, Requested: ${diffDays}` });
        }
        if (lType === client_1.LeaveType.EARNED && employee.earnedBalance < diffDays) {
            return res.status(400).json({ message: `Insufficient Earned leave balance. Available: ${employee.earnedBalance}, Requested: ${diffDays}` });
        }
        const leave = await prisma.leaveRequest.create({
            data: {
                employeeId: req.user.employeeId,
                leaveType: lType,
                startDate: start,
                endDate: end,
                reason,
                status: client_1.LeaveStatus.PENDING,
            },
            include: {
                employee: true,
            },
        });
        await (0, audit_js_1.logAction)(req.user.id, 'LEAVE_APPLY', null, { id: leave.id, leaveType: lType });
        // Notify Manager
        if (leave.employee.managerId) {
            const manager = await prisma.employee.findUnique({ where: { id: leave.employee.managerId } });
            if (manager) {
                await createNotification(manager.userId, 'Leave Application Pending', `${leave.employee.name} has requested ${leaveType} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`, 'LEAVE_APPROVAL');
            }
        }
        return res.status(201).json(leave);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error applying for leave', error: error.message });
    }
};
exports.applyLeave = applyLeave;
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await prisma.leaveRequest.findUnique({ where: { id } });
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }
        if (req.user?.role !== client_1.Role.ADMIN && leave.employeeId !== req.user?.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this leave request' });
        }
        if (leave.status !== client_1.LeaveStatus.PENDING) {
            return res.status(400).json({ message: 'Can only cancel pending leave requests' });
        }
        await prisma.leaveRequest.delete({ where: { id } });
        await (0, audit_js_1.logAction)(req.user?.id, 'LEAVE_CANCEL', { id }, null);
        return res.json({ message: 'Leave request cancelled successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error cancelling leave request', error: error.message });
    }
};
exports.cancelLeave = cancelLeave;
const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }
        if (leave.status !== client_1.LeaveStatus.PENDING) {
            return res.status(400).json({ message: 'Leave request is already processed' });
        }
        // Auth check: manager or admin
        if (req.user?.role === client_1.Role.MANAGER && leave.employee.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not manage this employee' });
        }
        const diffTime = Math.abs(leave.endDate.getTime() - leave.startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        // Update status and deduct balance in transaction
        const updated = await prisma.$transaction(async (tx) => {
            const request = await tx.leaveRequest.update({
                where: { id },
                data: {
                    status: client_1.LeaveStatus.APPROVED,
                    approverId: req.user?.employeeId,
                },
            });
            if (leave.leaveType !== client_1.LeaveType.WFH) {
                const balanceField = {
                    [client_1.LeaveType.CASUAL]: 'casualBalance',
                    [client_1.LeaveType.SICK]: 'sickBalance',
                    [client_1.LeaveType.EARNED]: 'earnedBalance',
                }[leave.leaveType];
                if (balanceField) {
                    const currentEmp = await tx.employee.findUnique({ where: { id: leave.employeeId } });
                    if (!currentEmp)
                        throw new Error('Employee not found');
                    const currentBalance = currentEmp[balanceField];
                    if (currentBalance < diffDays) {
                        throw new Error(`Insufficient leave balance. Available: ${currentBalance}, Required: ${diffDays}`);
                    }
                    await tx.employee.update({
                        where: { id: leave.employeeId },
                        data: {
                            [balanceField]: {
                                decrement: diffDays,
                            },
                        },
                    });
                }
            }
            return request;
        });
        // Automatically create Attendance entries as LEAVE for the date range
        const currentDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        while (currentDate <= endDate) {
            const dateString = new Date(currentDate.setHours(0, 0, 0, 0));
            try {
                await prisma.attendance.upsert({
                    where: {
                        employeeId_date: {
                            employeeId: leave.employeeId,
                            date: dateString,
                        },
                    },
                    update: {
                        status: client_1.AttendanceStatus.LEAVE,
                    },
                    create: {
                        employeeId: leave.employeeId,
                        date: dateString,
                        clockIn: dateString,
                        clockOut: dateString,
                        status: client_1.AttendanceStatus.LEAVE,
                        workHours: 0.0,
                    },
                });
            }
            catch (err) {
                console.error('Error pre-populating leave in attendance:', err);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        await (0, audit_js_1.logAction)(req.user?.id, 'LEAVE_APPROVE', { id }, { status: 'APPROVED' });
        // Notify employee
        await createNotification(leave.employee.userId, 'Leave Approved', `Your request for leave from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been approved.`, 'LEAVE_APPROVAL');
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error approving leave request', error: error.message });
    }
};
exports.approveLeave = approveLeave;
const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }
        if (req.user?.role === client_1.Role.MANAGER && leave.employee.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not manage this employee' });
        }
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: client_1.LeaveStatus.REJECTED,
                approverId: req.user?.employeeId,
            },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'LEAVE_REJECT', { id }, { status: 'REJECTED' });
        // Notify employee
        await createNotification(leave.employee.userId, 'Leave Request Rejected', `Your request for leave from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} was rejected.`, 'LEAVE_APPROVAL');
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error rejecting leave request', error: error.message });
    }
};
exports.rejectLeave = rejectLeave;
const getLeaveRequests = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { role, employeeId } = req.user;
        let requests;
        if (role === client_1.Role.ADMIN) {
            requests = await prisma.leaveRequest.findMany({
                where: {
                    employee: { deletedAt: null },
                },
                include: {
                    employee: { select: { id: true, name: true, designation: true } },
                    approver: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        else if (role === client_1.Role.MANAGER) {
            // Subordinates + self
            const subordinates = await prisma.employee.findMany({
                where: { managerId: employeeId, deletedAt: null },
                select: { id: true },
            });
            const subordinateIds = subordinates.map((s) => s.id);
            requests = await prisma.leaveRequest.findMany({
                where: {
                    employeeId: { in: [...subordinateIds, employeeId] },
                    employee: { deletedAt: null },
                },
                include: {
                    employee: { select: { id: true, name: true, designation: true } },
                    approver: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        else {
            // Employees see self
            requests = await prisma.leaveRequest.findMany({
                where: {
                    employeeId,
                    employee: { deletedAt: null },
                },
                include: {
                    employee: { select: { id: true, name: true, designation: true } },
                    approver: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        return res.json(requests);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving leave requests', error: error.message });
    }
};
exports.getLeaveRequests = getLeaveRequests;
const getLeaveBalances = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const employee = await prisma.employee.findUnique({
            where: { id: req.user.employeeId },
            select: {
                casualBalance: true,
                sickBalance: true,
                earnedBalance: true,
            },
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }
        return res.json(employee);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving leave balances', error: error.message });
    }
};
exports.getLeaveBalances = getLeaveBalances;
