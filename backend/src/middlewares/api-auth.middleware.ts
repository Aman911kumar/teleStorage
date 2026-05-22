import type { NextFunction, Response } from "express";
import { AppError } from "../core/errors.js";
import type { AuthenticatedRequest } from "../core/types.js";
import { ApiKeyService } from "../modules/api-keys/api-key.service.js";
import { WorkspaceModel } from "../modules/workspaces/workspace.model.js";
import { verifyTemporaryUploadToken, verifyUploadToken } from "../utils/apiTokens.js";

const apiKeyService = new ApiKeyService();

function readBearer(req: AuthenticatedRequest) {
  const auth = req.header("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;
}

function readUploadToken(req: AuthenticatedRequest) {
  return req.header("x-upload-token") ?? readBearer(req);
}

function setApiWorkspace(
  req: AuthenticatedRequest,
  workspace: { _id: unknown; createdBy: unknown; publicProjectId: string },
  extras?: { apiKeyId?: string; scopes?: string[] }
) {
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
  if (bearer.includes(":")) {
    const [publicKey, secret] = bearer.split(":", 2);
    return publicKey && secret ? { publicKey, secret } : undefined;
  }
  if (bearer.startsWith("pk_") && headerSecret) return { publicKey: bearer, secret: headerSecret };
  return undefined;
}

export async function requireApiAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const credentials = readApiCredentials(req);
    if (!credentials) throw new AppError("Missing API credentials. Send x-api-key and x-api-secret.", 401, "API_CREDENTIALS_REQUIRED");

    const { key, workspace } = await apiKeyService.authenticate(credentials.publicKey, credentials.secret, req.ip);
    setApiWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: key.scopes });
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireApiUploadAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const credentials = readApiCredentials(req);
    if (credentials) {
      const { key, workspace } = await apiKeyService.authenticate(credentials.publicKey, credentials.secret, req.ip);
      setApiWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: key.scopes });
      return next();
    }

    const temporaryToken = verifyTemporaryUploadToken(readUploadToken(req));
    if (temporaryToken) {
      const workspace = await WorkspaceModel.findOne({
        _id: temporaryToken.workspaceId,
        publicProjectId: temporaryToken.publicProjectId,
        isActive: true
      }).lean();
      if (!workspace) throw new AppError("Invalid or expired upload token.", 403, "INVALID_UPLOAD_TOKEN");
      setApiWorkspace(req, workspace, { scopes: temporaryToken.scopes });
      return next();
    }

    const publicProjectId = req.header("x-project-id") ?? (req.query.projectId as string | undefined);
    const uploadToken = readUploadToken(req);
    if (!publicProjectId || !uploadToken) {
      throw new AppError("Missing API credentials. Send x-api-key and x-api-secret, or a valid upload token.", 401, "API_CREDENTIALS_REQUIRED");
    }

    const workspace = await WorkspaceModel.findOne({ publicProjectId, isActive: true }).lean();
    if (!workspace || !verifyUploadToken(uploadToken, workspace.uploadTokenHash)) {
      throw new AppError("Invalid project credentials.", 403, "INVALID_PROJECT_CREDENTIALS");
    }

    setApiWorkspace(req, workspace, { scopes: ["upload"] });
    next();
  } catch (error) {
    next(error);
  }
}

export async function requirePublicApiKey(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const publicKey = req.header("x-api-key") ?? readBearer(req);
    if (!publicKey || publicKey.includes(":") || !publicKey.startsWith("pk_")) {
      throw new AppError("Missing public API key.", 401, "PUBLIC_API_KEY_REQUIRED");
    }

    const key = await apiKeyService.findPublicKey(publicKey, req.ip);
    const workspace = await WorkspaceModel.findOne({ _id: key.workspaceId, isActive: true }).lean();
    if (!workspace) throw new AppError("Workspace is disabled.", 403, "WORKSPACE_DISABLED");
    setApiWorkspace(req, workspace, { apiKeyId: String(key._id), scopes: ["upload"] });
    next();
  } catch (error) {
    next(error);
  }
}

export function looksLikeApiAuth(req: AuthenticatedRequest) {
  const bearer = readBearer(req);
  return Boolean(
    req.header("x-api-key") ||
      req.header("x-api-secret") ||
      req.header("x-upload-token") ||
      req.header("x-project-id") ||
      bearer?.startsWith("pk_") ||
      bearer?.startsWith("ut_") ||
      bearer?.startsWith("tst_")
  );
}
