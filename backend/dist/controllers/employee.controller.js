"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportEmployees = exports.getManagersList = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.detectCircularReporting = void 0;
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const audit_js_1 = require("../utils/audit.js");
const prisma = new client_1.PrismaClient();
// Helper to check circular manager paths
const detectCircularReporting = async (employeeId, managerId) => {
    let currentManagerId = managerId;
    while (currentManagerId) {
        if (currentManagerId === employeeId) {
            return true; // Loop detected
        }
        const mgr = await prisma.employee.findFirst({
            where: { id: currentManagerId, deletedAt: null },
            select: { managerId: true },
        });
        currentManagerId = mgr?.managerId || null;
    }
    return false;
};
exports.detectCircularReporting = detectCircularReporting;
const getAllEmployees = async (req, res) => {
    try {
        const { departmentId, role, search, status, managerId, page, limit } = req.query;
        const whereClause = {
            deletedAt: null,
        };
        if (departmentId) {
            whereClause.departmentId = departmentId;
        }
        if (status) {
            whereClause.employmentStatus = status;
        }
        if (managerId) {
            whereClause.managerId = managerId;
        }
        if (role) {
            whereClause.user = { role: role, deletedAt: null };
        }
        else {
            whereClause.user = { deletedAt: null };
        }
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { designation: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        // Pagination
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 50;
        const skip = (p - 1) * l;
        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                department: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
            skip,
            take: l,
        });
        const total = await prisma.employee.count({ where: whereClause });
        return res.json({
            employees,
            meta: {
                total,
                page: p,
                limit: l,
                pages: Math.ceil(total / l),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving employees', error: error.message });
    }
};
exports.getAllEmployees = getAllEmployees;
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.findFirst({
            where: { id, deletedAt: null },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
                department: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        designation: true,
                    },
                },
                subordinates: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        name: true,
                        designation: true,
                        employmentStatus: true,
                    },
                },
            },
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        return res.json(employee);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving employee details', error: error.message });
    }
};
exports.getEmployeeById = getEmployeeById;
const createEmployee = async (req, res) => {
    try {
        const { email, password, name, role, departmentId, designation, contactNumber, managerId, dateOfJoining } = req.body;
        const existingUser = await prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (existingUser) {
            return res.status(400).json({ message: 'User credentials already exist for this email' });
        }
        if (managerId) {
            const mgr = await prisma.employee.findFirst({ where: { id: managerId, deletedAt: null } });
            if (!mgr) {
                return res.status(400).json({ message: 'Manager employee not found' });
            }
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const employee = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password: passwordHash,
                    role: role || client_1.Role.EMPLOYEE,
                },
            });
            return tx.employee.create({
                data: {
                    userId: user.id,
                    name,
                    departmentId: departmentId || null,
                    designation: designation || null,
                    contactNumber: contactNumber || null,
                    managerId: managerId || null,
                    dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
                },
                include: {
                    user: {
                        select: { id: true, email: true, role: true }
                    }
                }
            });
        });
        // Audit log
        await (0, audit_js_1.logAction)(req.user?.id, 'EMPLOYEE_CREATE', null, { id: employee.id, name: employee.name, email });
        return res.status(201).json(employee);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error creating employee account', error: error.message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, departmentId, designation, contactNumber, managerId, employmentStatus, dateOfJoining, email } = req.body;
        const existingEmp = await prisma.employee.findFirst({
            where: { id, deletedAt: null },
            include: { user: true }
        });
        if (!existingEmp) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        if (managerId) {
            if (managerId === id) {
                return res.status(400).json({ message: 'An employee cannot report to themselves' });
            }
            const circular = await (0, exports.detectCircularReporting)(id, managerId);
            if (circular) {
                return res.status(400).json({ message: 'Circular reporting loop detected: Proposed manager already reports to this employee.' });
            }
        }
        const updatedEmployee = await prisma.$transaction(async (tx) => {
            // 1. Update user credentials if email or role changes
            if (email || role) {
                await tx.user.update({
                    where: { id: existingEmp.userId },
                    data: {
                        email: email || undefined,
                        role: role || undefined,
                    },
                });
            }
            // 2. Update employee profile
            return tx.employee.update({
                where: { id },
                data: {
                    name,
                    departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
                    designation,
                    contactNumber,
                    managerId: managerId !== undefined ? (managerId || null) : undefined,
                    employmentStatus: employmentStatus,
                    dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
                },
                include: {
                    user: { select: { id: true, email: true, role: true } }
                }
            });
        });
        // Audit Log
        await (0, audit_js_1.logAction)(req.user?.id, 'EMPLOYEE_UPDATE', { name: existingEmp.name, designation: existingEmp.designation, status: existingEmp.employmentStatus }, { name: updatedEmployee.name, designation: updatedEmployee.designation, status: updatedEmployee.employmentStatus });
        return res.json(updatedEmployee);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating employee', error: error.message });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.findFirst({
            where: { id, deletedAt: null }
        });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        // Soft-delete User and Employee in transaction
        await prisma.$transaction(async (tx) => {
            await tx.employee.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
            await tx.user.update({
                where: { id: employee.userId },
                data: { deletedAt: new Date() },
            });
        });
        // Audit Log
        await (0, audit_js_1.logAction)(req.user?.id, 'EMPLOYEE_DELETE', { id, name: employee.name }, null);
        return res.json({ message: 'Employee and user credentials deleted successfully (soft-deleted)' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting employee account', error: error.message });
    }
};
exports.deleteEmployee = deleteEmployee;
const getManagersList = async (req, res) => {
    try {
        const managers = await prisma.employee.findMany({
            where: {
                deletedAt: null,
                user: {
                    deletedAt: null,
                    role: {
                        in: [client_1.Role.MANAGER, client_1.Role.ADMIN],
                    },
                },
            },
            select: {
                id: true,
                name: true,
                designation: true,
                department: { select: { name: true } },
            },
            orderBy: {
                name: 'asc',
            },
        });
        return res.json(managers);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving managers list', error: error.message });
    }
};
exports.getManagersList = getManagersList;
const bulkImportEmployees = async (req, res) => {
    try {
        const { employees } = req.body;
        if (!employees || !Array.isArray(employees)) {
            return res.status(400).json({ message: 'Employees array is required' });
        }
        const defaultPassword = 'DefaultPassword123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };
        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const rowNum = i + 1;
            const { email, name, role, designation, contactNumber, departmentName } = emp;
            if (!email || !name) {
                results.failed++;
                results.errors.push(`Row ${rowNum}: Email and Name are required`);
                continue;
            }
            try {
                const existing = await prisma.user.findUnique({ where: { email } });
                if (existing) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: User with email "${email}" already exists`);
                    continue;
                }
                let departmentId = null;
                if (departmentName) {
                    const dept = await prisma.department.findUnique({ where: { name: departmentName } });
                    if (dept) {
                        departmentId = dept.id;
                    }
                    else {
                        const newDept = await prisma.department.create({
                            data: { name: departmentName, description: 'Created during bulk onboarding' }
                        });
                        departmentId = newDept.id;
                    }
                }
                await prisma.$transaction(async (tx) => {
                    const u = await tx.user.create({
                        data: {
                            email,
                            password: passwordHash,
                            role: role || client_1.Role.EMPLOYEE,
                        },
                    });
                    await tx.employee.create({
                        data: {
                            userId: u.id,
                            name,
                            departmentId,
                            designation: designation || null,
                            contactNumber: contactNumber || null,
                        },
                    });
                });
                results.success++;
            }
            catch (err) {
                results.failed++;
                results.errors.push(`Row ${rowNum}: ${err.message || 'Unknown database error'}`);
            }
        }
        await (0, audit_js_1.logAction)(req.user?.id, 'EMPLOYEE_BULK_IMPORT', null, {
            successCount: results.success,
            failedCount: results.failed
        });
        return res.json({
            message: `Bulk import completed. Success: ${results.success}, Failed: ${results.failed}`,
            results,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error during bulk import', error: error.message });
    }
};
exports.bulkImportEmployees = bulkImportEmployees;
