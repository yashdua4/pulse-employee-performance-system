import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { logAction } from '../utils/audit.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'pulse_performance_management_secret_key_2026_sdlfj39';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'pulse_refresh_token_secret_key_3849_slkdj';

// Token generation helpers
const generateAccessToken = (user: { id: string; email: string; role: Role; employee?: { id: string; name: string } | null }) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      employeeId: user.employee?.id, 
      name: user.employee?.name 
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = async (userId: string) => {
  const token = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, departmentId, designation, contactNumber, managerId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User and Employee in a single transaction - Force signup to strictly Role.EMPLOYEE
    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.EMPLOYEE,
        },
      });

      const emp = await tx.employee.create({
        data: {
          userId: u.id,
          name,
          departmentId: departmentId || null,
          designation: designation || null,
          contactNumber: contactNumber || null,
          managerId: managerId || null,
        },
      });

      return { ...u, employee: emp };
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = await generateRefreshToken(newUser.id);

    // Save tokens in cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Audit Log
    await logAction(newUser.id, 'SIGNUP', null, { email: newUser.email, name: newUser.employee.name, role: newUser.role });

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({ user: userWithoutPassword, accessToken, refreshToken });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error signing up', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
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
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({ 
        message: `Your account is temporarily locked due to too many failed attempts. Try again in ${remainingTime} minute(s).` 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const newAttempts = user.loginAttempts + 1;
      const lockoutData: any = { loginAttempts: newAttempts };

      if (newAttempts >= 5) {
        lockoutData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        lockoutData.loginAttempts = 0; // reset attempts for next lockout cycle
        await logAction(user.id, 'SECURITY_LOCKOUT', null, { 
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
          email: user.email 
        });
        await prisma.user.update({
          where: { id: user.id },
          data: lockoutData,
        });
        return res.status(403).json({ message: 'Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: lockoutData,
      });

      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Reset attempts on successful login
    if (user.loginAttempts > 0 || user.lockoutUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockoutUntil: null },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    // Save tokens in cookies
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

    // Log action
    await logAction(user.id, 'LOGIN');

    const { password: _, ...userWithoutPassword } = user;

    return res.json({ user: userWithoutPassword, accessToken, refreshToken });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

export const refreshTokenRotation = async (req: Request, res: Response) => {
  try {
    let { refreshToken } = req.body;

    if (!refreshToken && req.headers.cookie) {
      const match = req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (match) {
        refreshToken = decodeURIComponent(match[1]);
      }
    }

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify token exists in database
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: { employee: true },
        },
      },
    });

    if (!savedToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check expiry
    if (new Date() > savedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      return res.status(401).json({ message: 'Refresh token has expired' });
    }

    // Generate new pair (rotation)
    const accessToken = generateAccessToken(savedToken.user);
    const newRefreshToken = await generateRefreshToken(savedToken.userId);

    // Delete old refresh token
    await prisma.refreshToken.delete({ where: { id: savedToken.id } });

    // Save tokens in cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });

    await logAction(user.id, 'CHANGE_PASSWORD');

    return res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const token = randomBytes(20).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    await logAction(user.id, 'FORGOT_PASSWORD_REQUEST');

    return res.json({
      message: 'Password reset token generated successfully (returned for simulation)',
      resetToken: token,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error requesting password reset', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await prisma.user.findFirst({
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await logAction(user.id, 'PASSWORD_RESET');

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    let { refreshToken } = req.body;

    if (!refreshToken && req.headers.cookie) {
      const match = req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (match) {
        refreshToken = decodeURIComponent(match[1]);
      }
    }

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    if (req.user) {
      await logAction(req.user.id, 'LOGOUT');
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
            subordinates: {
              select: {
                id: true,
                name: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};
