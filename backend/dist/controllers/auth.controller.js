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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.refreshTokenRotation = exports.loginWithMfa = exports.login = exports.signup = void 0;
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const speakeasy_1 = __importDefault(require("speakeasy"));
const prisma_js_1 = require("../lib/prisma.js");
const crypto_js_1 = require("../utils/crypto.js");
const audit_js_1 = require("../utils/audit.js");
const security_js_1 = require("../utils/security.js");
const request_js_1 = require("../utils/request.js");
const JWT_SECRET = process.env.JWT_SECRET || 'pulse_performance_management_secret_key_2026_sdlfj39';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'pulse_refresh_token_secret_key_3849_slkdj';
const MFA_TEMP_SECRET = process.env.MFA_TEMP_SECRET || `${JWT_SECRET}_mfa_temp`;
const parseCookies = (cookieHeader) => {
    const list = {};
    if (!cookieHeader)
        return list;
    cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        const name = parts.shift()?.trim();
        if (name) {
            list[name] = decodeURIComponent(parts.join('='));
        }
    });
    return list;
};
const generateAccessToken = (user) => jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employee?.id,
    name: user.employee?.name,
    sessionId: user.sessionId,
}, JWT_SECRET, { expiresIn: '15m' });
const generateRefreshToken = (userId, sessionId) => jwt.sign({ id: userId, sessionId }, REFRESH_SECRET, { expiresIn: '7d' });
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};
const buildUserProfile = async (userId) => prisma_js_1.prisma.user.findUnique({
    where: { id: userId },
    include: {
        employee: {
            include: {
                department: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        },
    },
});
const issueSessionTokens = async (user, req, existingSessionId) => {
    const session = existingSessionId
        ? await prisma_js_1.prisma.userSession.update({
            where: { id: existingSessionId },
            data: {
                revoked: false,
                revokedAt: null,
                lastActivity: new Date(),
                ipAddress: (0, request_js_1.getClientIp)(req),
                userAgent: (0, request_js_1.getUserAgent)(req),
            },
        })
        : await (0, security_js_1.createSession)({ userId: user.id, req });
    const refreshToken = generateRefreshToken(user.id, session.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma_js_1.prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            sessionId: session.id,
            ipAddress: (0, request_js_1.getClientIp)(req),
            userAgent: (0, request_js_1.getUserAgent)(req),
            expiresAt,
        },
    });
    const accessToken = generateAccessToken({
        ...user,
        sessionId: session.id,
    });
    return {
        accessToken,
        refreshToken,
        session,
    };
};
const sanitizeUser = (user) => {
    if (!user)
        return null;
    const { password: _password, ...rest } = user;
    return rest;
};
const recordFailedLogin = async (req, email, user) => {
    await (0, audit_js_1.logAction)(user?.id, 'LOGIN_FAILED', null, {
        email,
        attempts: user ? user.loginAttempts + 1 : 1,
    }, {
        req,
        userEmail: email,
        targetEntity: 'User',
        targetId: user?.id || null,
    });
};
const signup = async (req, res) => {
    try {
        const { email, password, name, designation, contactNumber, managerId } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }
        const existingUser = await prisma_js_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma_js_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password: passwordHash,
                    role: client_1.Role.EMPLOYEE,
                },
            });
            const employee = await tx.employee.create({
                data: {
                    userId: user.id,
                    name,
                    designation: designation || null,
                    contactNumber: contactNumber || null,
                    managerId: managerId || null,
                },
            });
            return { ...user, employee };
        });
        const { accessToken, refreshToken } = await issueSessionTokens(newUser, req);
        setAuthCookies(res, accessToken, refreshToken);
        await (0, audit_js_1.logAction)(newUser.id, 'SIGNUP', null, { email: newUser.email, name }, {
            req,
            userEmail: newUser.email,
            targetEntity: 'User',
            targetId: newUser.id,
        });
        return res.status(201).json({
            user: sanitizeUser(newUser),
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error signing up', error: error.message });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { email },
            include: {
                employee: {
                    include: {
                        department: true,
                        manager: true,
                    },
                },
            },
        });
        if (!user) {
            await recordFailedLogin(req, email, null);
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            return res.status(403).json({
                message: `Your account is temporarily locked due to too many failed attempts. Try again later.`,
            });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            const newAttempts = user.loginAttempts + 1;
            const lockoutData = { loginAttempts: newAttempts };
            await recordFailedLogin(req, email, user);
            if (newAttempts >= 5) {
                lockoutData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
                lockoutData.loginAttempts = 0;
                await (0, security_js_1.createSuspiciousActivity)({
                    userId: user.id,
                    type: 'FAILED_LOGIN_BURST',
                    description: 'Five consecutive failed login attempts triggered an account lockout.',
                    severity: 'CRITICAL',
                    metadata: {
                        email: user.email,
                    },
                    req,
                });
            }
            await prisma_js_1.prisma.user.update({
                where: { id: user.id },
                data: lockoutData,
            });
            if (newAttempts >= 5) {
                return res.status(403).json({
                    message: 'Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.',
                });
            }
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        if (user.loginAttempts > 0 || user.lockoutUntil) {
            await prisma_js_1.prisma.user.update({
                where: { id: user.id },
                data: { loginAttempts: 0, lockoutUntil: null },
            });
        }
        if (user.mfaEnabled && user.mfaSecret) {
            const mfaToken = jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role,
                pendingMfa: true,
            }, MFA_TEMP_SECRET, { expiresIn: '10m' });
            return res.json({
                requiresMfa: true,
                mfaToken,
                message: 'MFA verification required',
            });
        }
        const { accessToken, refreshToken } = await issueSessionTokens(user, req);
        setAuthCookies(res, accessToken, refreshToken);
        await (0, audit_js_1.logAction)(user.id, 'LOGIN', null, { sessionIssued: true }, {
            req,
            userEmail: user.email,
            targetEntity: 'User',
            targetId: user.id,
        });
        return res.json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};
exports.login = login;
const loginWithMfa = async (req, res) => {
    try {
        const { mfaToken, otp } = req.body;
        if (!mfaToken || !otp) {
            return res.status(400).json({ message: 'MFA token and OTP are required' });
        }
        const decoded = jwt.verify(mfaToken, MFA_TEMP_SECRET);
        if (!decoded.pendingMfa) {
            return res.status(400).json({ message: 'Invalid MFA login state' });
        }
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                employee: {
                    include: {
                        department: true,
                        manager: true,
                    },
                },
            },
        });
        if (!user?.mfaEnabled || !user.mfaSecret) {
            return res.status(400).json({ message: 'MFA is not enabled for this user' });
        }
        const secret = (0, crypto_js_1.decryptText)(user.mfaSecret);
        const validOtp = speakeasy_1.default.totp.verify({
            secret,
            encoding: 'base32',
            token: otp,
            window: 1,
        });
        if (!validOtp) {
            await (0, audit_js_1.logAction)(user.id, 'LOGIN_FAILED', null, { email: user.email, reason: 'INVALID_MFA' }, {
                req,
                userEmail: user.email,
                targetEntity: 'User',
                targetId: user.id,
            });
            await (0, security_js_1.createSuspiciousActivity)({
                userId: user.id,
                type: 'MFA_LOGIN_FAILED',
                description: 'Invalid OTP during MFA login verification.',
                severity: 'HIGH',
                req,
            });
            return res.status(400).json({ message: 'Invalid OTP token' });
        }
        const { accessToken, refreshToken } = await issueSessionTokens(user, req);
        setAuthCookies(res, accessToken, refreshToken);
        await (0, audit_js_1.logAction)(user.id, 'LOGIN', null, { mfaVerified: true }, {
            req,
            userEmail: user.email,
            targetEntity: 'User',
            targetId: user.id,
        });
        return res.json({
            user: sanitizeUser(user),
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error verifying MFA login', error: error.message });
    }
};
exports.loginWithMfa = loginWithMfa;
const refreshTokenRotation = async (req, res) => {
    try {
        let { refreshToken } = req.body;
        if (!refreshToken && req.headers.cookie) {
            const cookies = parseCookies(req.headers.cookie);
            refreshToken = cookies['refreshToken'];
        }
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const savedToken = await prisma_js_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: {
                user: {
                    include: {
                        employee: true,
                    },
                },
                session: true,
            },
        });
        if (!savedToken || savedToken.revokedAt || !savedToken.session || savedToken.session.revoked) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        if (payload.sessionId !== savedToken.sessionId) {
            return res.status(401).json({ message: 'Refresh token session mismatch' });
        }
        if (new Date() > savedToken.expiresAt) {
            await prisma_js_1.prisma.refreshToken.update({
                where: { id: savedToken.id },
                data: { revokedAt: new Date() },
            });
            return res.status(401).json({ message: 'Refresh token has expired' });
        }
        const { accessToken, refreshToken: nextRefreshToken } = await issueSessionTokens(savedToken.user, req, savedToken.sessionId || undefined);
        await prisma_js_1.prisma.refreshToken.update({
            where: { id: savedToken.id },
            data: { revokedAt: new Date() },
        });
        setAuthCookies(res, accessToken, nextRefreshToken);
        return res.json({ accessToken, refreshToken: nextRefreshToken });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error refreshing token', error: error.message });
    }
};
exports.refreshTokenRotation = refreshTokenRotation;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old password and new password are required' });
        }
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Incorrect old password' });
        }
        const newHash = await bcrypt.hash(newPassword, 10);
        await prisma_js_1.prisma.user.update({
            where: { id: user.id },
            data: { password: newHash },
        });
        await (0, audit_js_1.logAction)(user.id, 'PASSWORD_CHANGE', null, { passwordChanged: true }, {
            req,
            userEmail: user.email,
            targetEntity: 'User',
            targetId: user.id,
        });
        return res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await prisma_js_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }
        const token = (0, crypto_1.randomBytes)(20).toString('hex');
        const expiry = new Date(Date.now() + 3600000);
        await prisma_js_1.prisma.user.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry,
            },
        });
        await (0, audit_js_1.logAction)(user.id, 'FORGOT_PASSWORD_REQUEST', null, { resetRequested: true }, {
            req,
            userEmail: user.email,
            targetEntity: 'User',
            targetId: user.id,
        });
        return res.json({
            message: 'Password reset token generated successfully (returned for simulation)',
            resetToken: token,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error requesting password reset', error: error.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        const user = await prisma_js_1.prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            return res.status(400).json({ message: 'Reset token is invalid or has expired' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma_js_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
        await (0, audit_js_1.logAction)(user.id, 'PASSWORD_RESET', null, { passwordReset: true }, {
            req,
            userEmail: user.email,
            targetEntity: 'User',
            targetId: user.id,
        });
        return res.json({ message: 'Password has been reset successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};
exports.resetPassword = resetPassword;
const logout = async (req, res) => {
    try {
        let { refreshToken } = req.body;
        if (!refreshToken && req.headers.cookie) {
            const cookies = parseCookies(req.headers.cookie);
            refreshToken = cookies['refreshToken'];
        }
        if (refreshToken) {
            const savedToken = await prisma_js_1.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true },
            });
            if (savedToken) {
                await prisma_js_1.prisma.refreshToken.update({
                    where: { id: savedToken.id },
                    data: { revokedAt: new Date() },
                });
                if (savedToken.sessionId) {
                    await (0, security_js_1.revokeSession)(savedToken.sessionId);
                }
                await (0, audit_js_1.logAction)(savedToken.userId, 'LOGOUT', null, { refreshTokenRevoked: true }, {
                    req,
                    userEmail: savedToken.user.email,
                    targetEntity: 'UserSession',
                    targetId: savedToken.sessionId || null,
                });
            }
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await buildUserProfile(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json(sanitizeUser(user));
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};
exports.getMe = getMe;
