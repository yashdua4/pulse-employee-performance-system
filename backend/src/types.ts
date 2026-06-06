import { Role } from '@prisma/client';

export interface AuthUser {
  id: string; // User ID
  email: string;
  role: Role;
  employeeId?: string; // Employee ID
  name?: string; // Employee Name
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
