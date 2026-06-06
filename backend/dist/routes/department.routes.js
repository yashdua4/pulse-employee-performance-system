"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const department_controller_js_1 = require("../controllers/department.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.get('/', department_controller_js_1.getAllDepartments);
// Admin only operations
router.post('/', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), department_controller_js_1.createDepartment);
router.put('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), department_controller_js_1.updateDepartment);
router.delete('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), department_controller_js_1.deleteDepartment);
exports.default = router;
