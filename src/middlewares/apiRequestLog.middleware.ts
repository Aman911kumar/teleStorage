import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../core/types.js";
import { ApiRequestLogModel } from "../modules/api-logs/api-request-log.model.js";
import { logger } from "../utils/logger.js";

export function apiRequestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api/v1")) return;
    ApiRequestLogModel.create({
      workspaceId: req.apiWorkspace?.id,
      owner: req.apiWorkspace?.ownerId,
      apiKeyId: req.apiWorkspace?.apiKeyId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - started,
      bytes: Number(res.getHeader("content-length")) || undefined,
      userAgent: req.get("user-agent"),
      ip: req.ip,
      success: res.statusCode < 400
    }).catch((error) => logger.warn("Unable to write API request log", { error: error instanceof Error ? error.message : String(error) }));
  });
  next();
}
