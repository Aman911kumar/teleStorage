import type { FilterQuery } from "mongoose";
import { MediaModel, type MediaDocument } from "./media.model.js";

export class MediaRepository {
  create(data: Record<string, unknown>) {
    return MediaModel.create(data);
  }

  findById(id: string) {
    return MediaModel.findById(id);
  }

  findByIdForWorkspace(id: string, workspaceId: string) {
    return MediaModel.findOne({ _id: id, workspaceId, status: { $ne: "deleted" } });
  }

  findByChecksum(checksum: string, workspaceId: string) {
    return MediaModel.findOne({ checksum, workspaceId, status: { $ne: "deleted" } });
  }

  markDeleted(id: string) {
    return MediaModel.findByIdAndUpdate(id, { status: "deleted" }, { new: true });
  }

  deleteById(id: string) {
    return MediaModel.findByIdAndDelete(id);
  }

  updateOrganization(id: string, uploadedBy: string, data: { folderId?: string | null; originalName?: string }) {
    return MediaModel.findOneAndUpdate({ _id: id, uploadedBy, status: { $ne: "deleted" } }, data, { new: true });
  }

  deleteMany(ids: string[], uploadedBy?: string) {
    const filter: FilterQuery<MediaDocument> = { _id: { $in: ids } };
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    return MediaModel.updateMany(filter, { status: "deleted" });
  }

  analytics() {
    return MediaModel.aggregate([
      { $match: { status: { $ne: "deleted" } } },
      {
        $group: {
          _id: "$provider",
          files: { $sum: 1 },
          bytes: { $sum: "$size" }
        }
      }
    ]);
  }

  workspaceStats(workspaceId: string) {
    return MediaModel.aggregate([
      { $match: { workspaceId, status: { $ne: "deleted" } } },
      {
        $group: {
          _id: "$workspaceId",
          uploadCount: { $sum: 1 },
          storageUsed: { $sum: "$size" },
          imageCount: { $sum: { $cond: [{ $eq: ["$mediaType", "image"] }, 1, 0] } },
          videoCount: { $sum: { $cond: [{ $eq: ["$mediaType", "video"] }, 1, 0] } }
        }
      }
    ]);
  }

  failedUploads() {
    return MediaModel.find({ status: "failed" }).sort({ updatedAt: -1 }).limit(100);
  }

  recent(uploadedBy: string, limit = 50) {
    return MediaModel.find({ uploadedBy, status: { $ne: "deleted" } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("originalName filename mimeType size visibility status createdAt thumbnail tags folderId customMetadata mediaType metadata");
  }

  listForWorkspace(workspaceId: string, options: { folderId?: string; limit?: number } = {}) {
    const filter: FilterQuery<MediaDocument> = { workspaceId, status: { $ne: "deleted" } };
    if (options.folderId) filter.folderId = options.folderId;
    return MediaModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(options.limit ?? 100, 250))
      .select("originalName filename mimeType size visibility status createdAt tags folderId customMetadata");
  }
}
