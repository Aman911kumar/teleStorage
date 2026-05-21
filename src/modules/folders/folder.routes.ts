import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { FolderService } from "./folder.service.js";

const service = new FolderService();

const createFolderSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80),
  parentId: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

const renameFolderSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80)
});

export const folderRouter = Router();

folderRouter.get(
  "/api/folders",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workspaceId = z.string().min(1).parse(req.query.workspaceId);
    const parentId = typeof req.query.parentId === "string" ? req.query.parentId : undefined;
    res.json({ success: true, data: await service.listForOwner(workspaceId, req.user!.id, parentId) });
  })
);

folderRouter.post(
  "/api/folders",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = createFolderSchema.parse(req.body);
    res.status(201).json({ success: true, data: await service.create(body.workspaceId, req.user!.id, body) });
  })
);

folderRouter.patch(
  "/api/folders/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = renameFolderSchema.parse(req.body);
    res.json({ success: true, data: await service.renameForOwner(body.workspaceId, req.user!.id, req.params.id, body.name) });
  })
);

folderRouter.delete(
  "/api/folders/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workspaceId = z.string().min(1).parse(req.query.workspaceId);
    await service.deleteForOwner(workspaceId, req.user!.id, req.params.id);
    res.status(204).send();
  })
);
