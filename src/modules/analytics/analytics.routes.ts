import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { MediaModel } from "../media/media.model.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/api/analytics",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const owner = req.user!.id;
    const ownerId = new Types.ObjectId(owner);
    const [mediaStats, workspaces, recentUploads, fileTypes] = await Promise.all([
      MediaModel.aggregate([
        { $match: { uploadedBy: ownerId, status: { $ne: "deleted" } } },
        { $group: { _id: null, totalFiles: { $sum: 1 }, storageUsed: { $sum: "$size" } } }
      ]),
      WorkspaceModel.find({ createdBy: owner, isActive: true })
        .sort({ createdAt: -1 })
        .select("-telegramBotTokenEncrypted")
        .lean(),
      MediaModel.find({ uploadedBy: owner, status: { $ne: "deleted" } })
        .sort({ createdAt: -1 })
        .limit(12)
        .select("originalName mimeType size status createdAt visibility")
        .lean(),
      MediaModel.aggregate([
        { $match: { uploadedBy: ownerId, status: { $ne: "deleted" } } },
        { $group: { _id: "$mimeType", count: { $sum: 1 }, bytes: { $sum: "$size" } } },
        { $sort: { bytes: -1 } },
        { $limit: 8 }
      ])
    ]);

    const totals = mediaStats[0] ?? { totalFiles: 0, storageUsed: 0 };
    res.json({
      success: true,
      data: {
        storageUsed: totals.storageUsed,
        totalFiles: totals.totalFiles,
        uploadRequests: totals.totalFiles,
        bandwidthUsed: workspaces.reduce((sum, workspace) => sum + (workspace.bandwidthUsed ?? 0), 0),
        compressionSavings: workspaces.reduce((sum, workspace) => sum + (workspace.compressionSavings ?? 0), 0),
        apiRequests: workspaces.reduce((sum, workspace) => sum + (workspace.uploadCount ?? 0), 0),
        imageCount: workspaces.reduce((sum, workspace) => sum + (workspace.imageCount ?? 0), 0),
        videoCount: workspaces.reduce((sum, workspace) => sum + (workspace.videoCount ?? 0), 0),
        workspaces,
        recentUploads,
        fileTypes,
        activity: []
      }
    });
  })
);
