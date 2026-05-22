import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { ApiKeyService } from "./api-key.service.js";
import { ApiRequestLogModel } from "../api-logs/api-request-log.model.js";

const service = new ApiKeyService();

const apiKeySchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2).max(80),
  scopes: z.array(z.enum(["upload", "read", "write", "delete", "full"])).optional()
});

export const apiKeyRouter = Router();

apiKeyRouter.get(
  "/api/api-keys",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.list(req.user!.id, req.query.workspaceId as string | undefined) });
  })
);

apiKeyRouter.post(
  "/api/api-keys",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = apiKeySchema.parse(req.body);
    res.status(201).json({ success: true, data: await service.create(req.user!.id, body) });
  })
);

apiKeyRouter.post(
  "/api/api-keys/:id/regenerate",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.regenerate(req.user!.id, req.params.id) });
  })
);

apiKeyRouter.delete(
  "/api/api-keys/:id/permanent",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await service.deletePermanently(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

apiKeyRouter.delete(
  "/api/api-keys/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.revoke(req.user!.id, req.params.id) });
  })
);

apiKeyRouter.get(
  "/api/api-request-logs",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filter: Record<string, unknown> = { owner: req.user!.id };
    if (typeof req.query.workspaceId === "string") filter.workspaceId = req.query.workspaceId;
    const logs = await ApiRequestLogModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: logs });
  })
);
