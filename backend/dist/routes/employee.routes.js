"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_js_1 = require("../controllers/employee.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const validation_middleware_js_1 = require("../middleware/validation.middleware.js");
const employee_validation_js_1 = require("../validations/employee.validation.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// Directory lists and manager selection are available to authenticated users
router.get('/', employee_controller_js_1.getAllEmployees);
router.get('/managers', employee_controller_js_1.getManagersList);
router.get('/:id', employee_controller_js_1.getEmployeeById);
// Admin-only operations
router.post('/bulk-import', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), employee_controller_js_1.bulkImportEmployees);
router.post('/', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), (0, validation_middleware_js_1.validateRequest)(employee_validation_js_1.createEmployeeSchema), employee_controller_js_1.createEmployee);
router.put('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), (0, validation_middleware_js_1.validateRequest)(employee_validation_js_1.updateEmployeeSchema), employee_controller_js_1.updateEmployee);
router.delete('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), employee_controller_js_1.deleteEmployee);
exports.default = router;
