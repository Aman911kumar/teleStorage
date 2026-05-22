import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../core/types.js";

export function publicMediaAccess(_req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  next();
}
