"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_js_1 = require("../controllers/analytics.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// Reports available to Managers & Admins
router.get('/reports', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), analytics_controller_js_1.getReports);
// Audit logs restricted to Admin only
router.get('/audit-logs', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN]), analytics_controller_js_1.getAuditLogs);
// Aggregated charts data for Dashboard
router.get('/charts', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), analytics_controller_js_1.getChartAnalytics);
exports.default = router;
