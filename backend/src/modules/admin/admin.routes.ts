import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { MediaRepository } from "../media/media.repository.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";
import { NotFoundError } from "../../core/errors.js";

const repository = new MediaRepository();
export const adminRouter = Router();
const quotaSchema = z.object({
  storageLimitBytes: z.coerce.number().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  storageLimitGb: z.coerce.number().min(0).max(Number.MAX_SAFE_INTEGER / 1024 / 1024 / 1024).optional()
}).refine((value) => value.storageLimitBytes !== undefined || value.storageLimitGb !== undefined, {
  message: "storageLimitBytes or storageLimitGb is required"
});

adminRouter.get(
  "/admin/media/analytics",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await repository.analytics() });
  })
);

adminRouter.patch(
  "/admin/workspaces/:id/quota",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = quotaSchema.parse(req.body);
    const storageLimitBytes = body.storageLimitBytes ?? Math.round((body.storageLimitGb ?? 0) * 1024 * 1024 * 1024);
    const workspace = await WorkspaceModel.findByIdAndUpdate(
      req.params.id,
      { storageLimitBytes },
      { new: true }
    )
      .select("-telegramBotTokenEncrypted -uploadTokenHash")
      .lean();
    if (!workspace) throw new NotFoundError("Workspace not found");
    res.json({ success: true, data: workspace });
  })
);

adminRouter.get(
  "/admin/media/failed",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await repository.failedUploads() });
  })
);

adminRouter.get(
  "/admin/media/storage-usage",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const analytics = await repository.analytics();
    const totalBytes = analytics.reduce((sum, item) => sum + item.bytes, 0);
    res.json({ success: true, data: { totalBytes, byProvider: analytics } });
  })
);
