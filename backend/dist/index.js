"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = require("express-rate-limit");
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const index_js_1 = __importDefault(require("./routes/index.js"));
const security_middleware_js_1 = require("./middleware/security.middleware.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
// Security: Enable CORS
app.use((0, cors_1.default)({
    origin: '*', // For local testing. In production, configure specific allowed domains.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Security: Rate Limiting
const globalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Relaxed global limit (1000 requests per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again after 15 minutes' },
});
const authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Strict limit (10 attempts per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts, please try again after 15 minutes' },
});
const signupLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Lightweight anti-spam limit (50 attempts per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: 'Too many account creation attempts, please try again after 15 minutes' },
});
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/signup', signupLimiter);
app.post('/api/auth/forgot-password', authLimiter);
app.use('/api/', globalLimiter, security_middleware_js_1.trackRequestVolume);
// API Routes
app.use('/api', index_js_1.default);
// Base route for connectivity checks
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Error handling middleware fallback
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});
// Boot server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
