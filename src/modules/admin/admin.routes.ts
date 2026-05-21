import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { MediaRepository } from "../media/media.repository.js";

const repository = new MediaRepository();
export const adminRouter = Router();

adminRouter.get(
  "/admin/media/analytics",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await repository.analytics() });
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
