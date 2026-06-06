"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_js_1 = require("../controllers/review.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const validation_middleware_js_1 = require("../middleware/validation.middleware.js");
const review_validation_js_1 = require("../validations/review.validation.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.get('/', review_controller_js_1.getAllReviews);
router.get('/:id', review_controller_js_1.getReviewById);
router.post('/', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), (0, validation_middleware_js_1.validateRequest)(review_validation_js_1.createReviewSchema), review_controller_js_1.createReview);
router.put('/:id', (0, validation_middleware_js_1.validateRequest)(review_validation_js_1.updateReviewSchema), review_controller_js_1.updateReview); // Employee can put to acknowledge, Admin/Manager can update draft content
router.delete('/:id', (0, auth_middleware_js_1.requireRoles)([client_1.Role.ADMIN, client_1.Role.MANAGER]), review_controller_js_1.deleteReview);
exports.default = router;
