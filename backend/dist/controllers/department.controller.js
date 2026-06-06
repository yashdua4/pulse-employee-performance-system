"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getAllDepartments = void 0;
const client_1 = require("@prisma/client");
const audit_js_1 = require("../utils/audit.js");
const prisma = new client_1.PrismaClient();
const getAllDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { employees: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return res.json(departments);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching departments', error: error.message });
    }
};
exports.getAllDepartments = getAllDepartments;
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Department name is required' });
        }
        const existing = await prisma.department.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ message: 'Department with this name already exists' });
        }
        const dept = await prisma.department.create({
            data: { name, description },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'DEPARTMENT_CREATE', null, dept);
        return res.status(201).json(dept);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error creating department', error: error.message });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const dept = await prisma.department.findUnique({ where: { id } });
        if (!dept) {
            return res.status(404).json({ message: 'Department not found' });
        }
        const updated = await prisma.department.update({
            where: { id },
            data: { name, description },
        });
        await (0, audit_js_1.logAction)(req.user?.id, 'DEPARTMENT_UPDATE', dept, updated);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating department', error: error.message });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const dept = await prisma.department.findUnique({ where: { id } });
        if (!dept) {
            return res.status(404).json({ message: 'Department not found' });
        }
        await prisma.department.delete({ where: { id } });
        await (0, audit_js_1.logAction)(req.user?.id, 'DEPARTMENT_DELETE', { id, name: dept.name }, null);
        return res.json({ message: 'Department deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting department', error: error.message });
    }
};
exports.deleteDepartment = deleteDepartment;
