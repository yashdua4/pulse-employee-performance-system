"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getAllProjects = void 0;
const client_1 = require("@prisma/client");
const audit_js_1 = require("../utils/audit.js");
const prisma = new client_1.PrismaClient();
// Helper to create member notification
const createNotification = async (userId, title, message, type) => {
    try {
        await prisma.notification.create({
            data: { userId, title, message, type },
        });
    }
    catch (err) {
        console.error('Failed to generate notification:', err);
    }
};
const getAllProjects = async (req, res) => {
    try {
        if (!req.user || !req.user.employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { role, employeeId } = req.user;
        let projects;
        if (role === client_1.Role.ADMIN) {
            projects = await prisma.project.findMany({
                where: { deletedAt: null },
                include: {
                    manager: {
                        select: { id: true, name: true, designation: true },
                    },
                    members: {
                        include: {
                            employee: { select: { id: true, name: true, designation: true } },
                        },
                    },
                    _count: {
                        select: {
                            tasks: {
                                where: { deletedAt: null },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        else if (role === client_1.Role.MANAGER) {
            projects = await prisma.project.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { managerId: employeeId },
                        { members: { some: { employeeId } } },
                    ],
                },
                include: {
                    manager: {
                        select: { id: true, name: true, designation: true },
                    },
                    members: {
                        include: {
                            employee: { select: { id: true, name: true, designation: true } },
                        },
                    },
                    _count: {
                        select: {
                            tasks: {
                                where: { deletedAt: null },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        else {
            projects = await prisma.project.findMany({
                where: {
                    deletedAt: null,
                    members: { some: { employeeId } },
                },
                include: {
                    manager: {
                        select: { id: true, name: true, designation: true },
                    },
                    members: {
                        include: {
                            employee: { select: { id: true, name: true, designation: true } },
                        },
                    },
                    _count: {
                        select: {
                            tasks: {
                                where: { deletedAt: null },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        return res.json(projects);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving projects', error: error.message });
    }
};
exports.getAllProjects = getAllProjects;
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findFirst({
            where: { id, deletedAt: null },
            include: {
                manager: {
                    select: { id: true, name: true, designation: true },
                },
                members: {
                    include: {
                        employee: { select: { id: true, name: true, designation: true } },
                    },
                },
                tasks: {
                    where: { deletedAt: null },
                    include: {
                        assignee: {
                            select: { id: true, name: true, designation: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Role check
        if (req.user?.role === client_1.Role.EMPLOYEE && req.user.employeeId) {
            const isMember = project.members.some((m) => m.employeeId === req.user?.employeeId);
            if (!isMember) {
                return res.status(403).json({ message: 'Access denied to this project board' });
            }
        }
        return res.json(project);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving project details', error: error.message });
    }
};
exports.getProjectById = getProjectById;
const createProject = async (req, res) => {
    try {
        const { name, description, status, priority, startDate, endDate, managerId, memberIds } = req.body;
        if (!name || !managerId) {
            return res.status(400).json({ message: 'Project name and managerId are required' });
        }
        const project = await prisma.project.create({
            data: {
                name,
                description,
                status: status || client_1.ProjectStatus.NOT_STARTED,
                priority: priority || client_1.ProjectPriority.MEDIUM,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                managerId,
                members: memberIds && Array.isArray(memberIds)
                    ? {
                        create: memberIds.map((empId) => ({
                            employeeId: empId,
                        })),
                    }
                    : undefined,
            },
            include: {
                manager: true,
                members: { include: { employee: true } },
            },
        });
        // Write Audit Log
        await (0, audit_js_1.logAction)(req.user?.id, 'PROJECT_CREATE', null, { id: project.id, name: project.name });
        // Send Notification to members
        if (memberIds && Array.isArray(memberIds)) {
            for (const empId of memberIds) {
                const emp = await prisma.employee.findUnique({ where: { id: empId } });
                if (emp) {
                    await createNotification(emp.userId, 'New Project Assignment', `You have been assigned as a member on the project "${project.name}".`, 'PROJECT_ASSIGNMENT');
                }
            }
        }
        return res.status(201).json(project);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error creating project', error: error.message });
    }
};
exports.createProject = createProject;
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, priority, startDate, endDate, managerId, memberIds } = req.body;
        const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Role check: Managers can only edit projects they lead (Admins can edit any)
        if (req.user?.role === client_1.Role.MANAGER && project.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not manage this project' });
        }
        const updateData = {
            name,
            description,
            status: status,
            priority: priority,
            managerId,
        };
        if (startDate) {
            updateData.startDate = new Date(startDate);
        }
        if (endDate !== undefined) {
            updateData.endDate = endDate ? new Date(endDate) : null;
        }
        // Sync project member junction tables
        if (memberIds && Array.isArray(memberIds)) {
            // 1. Delete old memberships
            await prisma.projectMember.deleteMany({ where: { projectId: id } });
            // 2. Create new memberships
            updateData.members = {
                create: memberIds.map((empId) => ({
                    employeeId: empId,
                })),
            };
        }
        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                manager: true,
                members: { include: { employee: true } },
            },
        });
        // Write Audit Log
        await (0, audit_js_1.logAction)(req.user?.id, 'PROJECT_UPDATE', { name: project.name, status: project.status }, { name: updatedProject.name, status: updatedProject.status });
        return res.json(updatedProject);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating project', error: error.message });
    }
};
exports.updateProject = updateProject;
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (req.user?.role === client_1.Role.MANAGER && project.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not manage this project' });
        }
        await prisma.$transaction(async (tx) => {
            await tx.project.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
            await tx.task.updateMany({
                where: { projectId: id },
                data: { deletedAt: new Date() },
            });
        });
        // Write Audit Log
        await (0, audit_js_1.logAction)(req.user?.id, 'PROJECT_DELETE', { id, name: project.name }, null);
        return res.json({ message: 'Project deleted successfully (soft-deleted)' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
};
exports.deleteProject = deleteProject;
// Task Operations
const createTask = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { title, description, status, dueDate, assigneeId } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Task title is required' });
        }
        const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (req.user?.role === client_1.Role.MANAGER && project.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not manage this project' });
        }
        const task = await prisma.task.create({
            data: {
                title,
                description,
                status: status || client_1.TaskStatus.TO_DO,
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId,
                assigneeId: assigneeId || null,
            },
            include: {
                assignee: true,
            },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'TASK_CREATE', null, { id: task.id, title: task.title });
        // Notify assignee
        if (assigneeId) {
            const emp = await prisma.employee.findUnique({ where: { id: assigneeId } });
            if (emp) {
                await createNotification(emp.userId, 'New Task Assigned', `You have been assigned a task "${task.title}" under project "${project.name}".`, 'TASK_ASSIGNMENT');
            }
        }
        return res.status(201).json(task);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error creating task', error: error.message });
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title, description, status, dueDate, assigneeId } = req.body;
        const task = await prisma.task.findFirst({
            where: { id: taskId, deletedAt: null },
            include: { project: true },
        });
        if (!task || task.project.deletedAt !== null) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // Employees can only update status of their assigned tasks
        if (req.user?.role === client_1.Role.EMPLOYEE) {
            if (task.assigneeId !== req.user.employeeId) {
                return res.status(403).json({ message: 'Forbidden: Task not assigned to you' });
            }
            const updated = await prisma.task.update({
                where: { id: taskId },
                data: { status: status },
            });
            return res.json(updated);
        }
        // Managers/Admins can edit everything
        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                title,
                description,
                status: status,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
            },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'TASK_UPDATE', { id: taskId, status: task.status }, { status: updated.status });
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating task', error: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await prisma.task.findFirst({
            where: { id: taskId, deletedAt: null },
            include: { project: true },
        });
        if (!task || task.project.deletedAt !== null) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (req.user?.role === client_1.Role.MANAGER && task.project.managerId !== req.user.employeeId) {
            return res.status(403).json({ message: 'Forbidden: You do not lead this project' });
        }
        await prisma.task.update({
            where: { id: taskId },
            data: { deletedAt: new Date() },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'TASK_DELETE', { id: taskId, title: task.title }, null);
        return res.json({ message: 'Task deleted successfully (soft-deleted)' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting task', error: error.message });
    }
};
exports.deleteTask = deleteTask;
