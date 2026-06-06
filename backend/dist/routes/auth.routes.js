"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
router.post('/signup', auth_controller_js_1.signup);
router.post('/login', auth_controller_js_1.login);
router.post('/refresh', auth_controller_js_1.refreshTokenRotation);
router.post('/forgot-password', auth_controller_js_1.forgotPassword);
router.post('/reset-password', auth_controller_js_1.resetPassword);
router.post('/logout', auth_controller_js_1.logout);
// Authenticated routes
router.get('/me', auth_middleware_js_1.authenticate, auth_controller_js_1.getMe);
router.post('/change-password', auth_middleware_js_1.authenticate, auth_controller_js_1.changePassword);
exports.default = router;
