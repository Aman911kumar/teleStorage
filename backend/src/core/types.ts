import type { Request } from "express";

export type Role = "user" | "admin";
export type ApiScope = "upload" | "read" | "write" | "delete" | "admin" | "full";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  workspaceId?: string;
  apiWorkspace?: {
    id: string;
    ownerId: string;
    publicProjectId: string;
    apiKeyId?: string;
    scopes?: ApiScope[] | string[];
  };
}
