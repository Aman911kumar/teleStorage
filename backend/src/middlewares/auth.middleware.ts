import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedRequest, AuthUser, Role } from "../core/types.js";
import { ForbiddenError } from "../core/errors.js";

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ForbiddenError("Missing bearer token"));
  }

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
    return next();
  } catch {
    return next(new ForbiddenError("Invalid token"));
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
  } catch {
    req.user = undefined;
  }
  return next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    return next();
  };
}
