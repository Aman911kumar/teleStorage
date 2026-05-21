import type { Request } from "express";

export type Role = "user" | "admin";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  workspaceId?: string;
}
