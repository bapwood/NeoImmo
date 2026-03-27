import { Role } from '@prisma/client';
import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

export interface AuthenticatedRequestUser {
  userId: number;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedRequestUser;
}
