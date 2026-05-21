import type { FilterQuery } from "mongoose";
import { MediaModel, type MediaDocument } from "./media.model.js";

export class MediaRepository {
  create(data: Record<string, unknown>) {
    return MediaModel.create(data);
  }

  findById(id: string) {
    return MediaModel.findById(id);
  }

  findByChecksum(checksum: string, uploadedBy?: string) {
    return MediaModel.findOne({ checksum, uploadedBy, status: { $ne: "deleted" } });
  }

  markDeleted(id: string) {
    return MediaModel.findByIdAndUpdate(id, { status: "deleted" }, { new: true });
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

  failedUploads() {
    return MediaModel.find({ status: "failed" }).sort({ updatedAt: -1 }).limit(100);
  }

  recent(uploadedBy: string, limit = 50) {
    return MediaModel.find({ uploadedBy, status: { $ne: "deleted" } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("originalName filename mimeType size visibility status createdAt thumbnail tags");
  }
}
