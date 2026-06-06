"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leave_controller_js_1 = require("../controllers/leave.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const validation_middleware_js_1 = require("../middleware/validation.middleware.js");
const leave_validation_js_1 = require("../validations/leave.validation.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.get('/balances', leave_controller_js_1.getLeaveBalances);
router.get('/', leave_controller_js_1.getLeaveRequests);
router.post('/apply', (0, validation_middleware_js_1.validateRequest)(leave_validation_js_1.applyLeaveSchema), leave_controller_js_1.applyLeave);
router.delete('/:id/cancel', leave_controller_js_1.cancelLeave);
// Manager / Admin approvals
router.post('/:id/approve', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), leave_controller_js_1.approveLeave);
router.post('/:id/reject', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), leave_controller_js_1.rejectLeave);
exports.default = router;
