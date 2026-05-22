import type { NextFunction, Response } from "express";
import { ForbiddenError } from "../core/errors.js";
import type { AuthenticatedRequest } from "../core/types.js";
import { verifyTemporaryUploadToken, verifyUploadToken } from "../utils/apiTokens.js";
import { WorkspaceModel } from "../modules/workspaces/workspace.model.js";
import { ApiKeyService } from "../modules/api-keys/api-key.service.js";

const apiKeyService = new ApiKeyService();

function readBearer(req: AuthenticatedRequest) {
  const auth = req.header("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
}

function readUploadToken(req: AuthenticatedRequest) {
  const headerToken = req.header("x-upload-token");
  if (headerToken) return headerToken;
  const bearer = readBearer(req);
  if (bearer) return bearer;
  return undefined;
}

function setWorkspace(req: AuthenticatedRequest, workspace: { _id: unknown; createdBy: unknown; publicProjectId: string }, extras?: { apiKeyId?: string; scopes?: string[] }) {
  req.apiWorkspace = {
    id: String(workspace._id),
    ownerId: String(workspace.createdBy),
    publicProjectId: workspace.publicProjectId,
    apiKeyId: extras?.apiKeyId,
    scopes: extras?.scopes
  };
}

function readApiCredentials(req: AuthenticatedRequest) {
  const headerKey = req.header("x-api-key");
  const headerSecret = req.header("x-api-secret");
  if (headerKey && headerSecret) return { publicKey: headerKey, secret: headerSecret };
  const bearer = readBearer(req);
  if (!bearer) return undefined;
  const [publicKey, secret] = bearer.includes(":") ? bearer.split(":", 2) : [bearer, req.header("x-api-secret") ?? ""];
  if (!publicKey || !secret) return undefined;
  return { publicKey, secret };
}

export async function requireWorkspaceUploadToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const apiCredentials = readApiCredentials(req);
    if (apiCredentials) {
      const { key, workspace } = await apiKeyService.authenticate(apiCredentials.publicKey, apiCredentials.secret, req.ip);
      setWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: key.scopes });
      return next();
    }

    const temporaryToken = verifyTemporaryUploadToken(readUploadToken(req));
    if (temporaryToken) {
      const workspace = await WorkspaceModel.findOne({
        _id: temporaryToken.workspaceId,
        publicProjectId: temporaryToken.publicProjectId,
        isActive: true
      }).lean();
      if (!workspace) throw new ForbiddenError("Invalid or expired upload token");
      setWorkspace(req, workspace, { scopes: temporaryToken.scopes });
      return next();
    }

    const publicProjectId = req.header("x-project-id") ?? (req.query.projectId as string | undefined);
    const uploadToken = readUploadToken(req);
    if (!publicProjectId || !uploadToken) {
      throw new ForbiddenError("API key and secret are required");
    }

    const workspace = await WorkspaceModel.findOne({ publicProjectId, isActive: true }).lean();
    if (!workspace || !verifyUploadToken(uploadToken, workspace.uploadTokenHash)) {
      throw new ForbiddenError("Invalid project credentials");
    }

    setWorkspace(req, workspace, { scopes: ["upload"] });
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireApiKeySecret(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const apiCredentials = readApiCredentials(req);
    if (!apiCredentials) throw new ForbiddenError("API key and secret are required");
    const { key, workspace } = await apiKeyService.authenticate(apiCredentials.publicKey, apiCredentials.secret, req.ip);
    setWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: key.scopes });
    next();
  } catch (error) {
    next(error);
  }
}

export async function requirePublicApiKey(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const publicKey = req.header("x-api-key") ?? readBearer(req);
    if (!publicKey || publicKey.includes(":")) throw new ForbiddenError("Public API key is required");
    const key = await apiKeyService.findPublicKey(publicKey, req.ip);
    const workspace = await WorkspaceModel.findOne({ _id: key.workspaceId, isActive: true }).lean();
    if (!workspace) throw new ForbiddenError("Workspace is disabled");
    setWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: ["upload"] });
    next();
  } catch (error) {
    next(error);
  }
}
