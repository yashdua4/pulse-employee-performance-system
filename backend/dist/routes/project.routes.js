"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_js_1 = require("../controllers/project.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const validation_middleware_js_1 = require("../middleware/validation.middleware.js");
const project_validation_js_1 = require("../validations/project.validation.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// Projects routing
router.get('/', project_controller_js_1.getAllProjects);
router.get('/:id', project_controller_js_1.getProjectById);
router.post('/', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), (0, validation_middleware_js_1.validateRequest)(project_validation_js_1.createProjectSchema), project_controller_js_1.createProject);
router.put('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), (0, validation_middleware_js_1.validateRequest)(project_validation_js_1.updateProjectSchema), project_controller_js_1.updateProject);
router.delete('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), project_controller_js_1.deleteProject);
// Tasks routing
router.post('/:id/tasks', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), (0, validation_middleware_js_1.validateRequest)(project_validation_js_1.createTaskSchema), project_controller_js_1.createTask);
router.put('/tasks/:taskId', (0, validation_middleware_js_1.validateRequest)(project_validation_js_1.updateTaskSchema), project_controller_js_1.updateTask); // Assignee (Employee) can update status, Manager can edit all
router.delete('/tasks/:taskId', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), project_controller_js_1.deleteTask);
exports.default = router;
