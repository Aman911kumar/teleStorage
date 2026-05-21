import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { WorkspaceService } from "./workspace.service.js";

const service = new WorkspaceService();
const workspaceSchema = z.object({
  name: z.string().min(2).max(80),
  telegramBotToken: z.string().min(20),
  telegramChannelId: z.string().min(3)
});
const validationSchema = workspaceSchema.omit({ name: true });
const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  telegramBotToken: z.string().min(20).optional(),
  telegramChannelId: z.string().min(3).optional()
});

export const workspaceRouter = Router();

workspaceRouter.get(
  "/api/workspaces",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.list(req.user!.id) });
  })
);

workspaceRouter.post(
  "/api/workspaces/validate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = validationSchema.parse(req.body);
    res.json({ success: true, data: await service.validateConfig(body) });
  })
);

workspaceRouter.post(
  "/api/workspaces",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = workspaceSchema.parse(req.body);
    res.status(201).json({ success: true, data: await service.create(req.user!.id, body) });
  })
);

workspaceRouter.patch(
  "/api/workspaces/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = updateWorkspaceSchema.parse(req.body);
    res.json({ success: true, data: await service.update(req.user!.id, req.params.id, body) });
  })
);

workspaceRouter.patch(
  "/api/workspaces/:id/reconnect",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = validationSchema.parse(req.body);
    res.json({ success: true, data: await service.reconnect(req.user!.id, req.params.id, body) });
  })
);

workspaceRouter.delete(
  "/api/workspaces/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await service.delete(req.user!.id, req.params.id);
    res.status(204).send();
  })
);
