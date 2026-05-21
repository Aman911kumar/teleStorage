import fs from "node:fs/promises";
import { MediaModel } from "../modules/media/media.model.js";
import { MediaProcessor } from "../modules/media/media.processor.js";
import { createStorageProvider } from "../providers/index.js";

export async function processVideoTranscoding(jobData: { mediaId: string; sourcePath: string }) {
  const processor = new MediaProcessor();
  const storage = createStorageProvider();
  const processed = await processor.createVideoVariants(jobData.sourcePath);
  const uploadedVariants = [];

  for (const variant of processed.variants) {
    const upload = await storage.uploadFile({ ...variant, kind: "video" });
    const stat = await fs.stat(variant.path);
    uploadedVariants.push({ ...variant, ...upload, size: stat.size });
    await fs.rm(variant.path, { force: true });
  }

  const thumbnailUpload = await storage.uploadFile({ ...processed.thumbnail, kind: "thumbnail" });
  const thumbnailStat = await fs.stat(processed.thumbnail.path);

  await MediaModel.findByIdAndUpdate(jobData.mediaId, {
    variants: uploadedVariants,
    thumbnail: { ...processed.thumbnail, ...thumbnailUpload, size: thumbnailStat.size },
    status: "ready"
  });

  await fs.rm(processed.thumbnail.path, { force: true });
  await fs.rm(jobData.sourcePath, { force: true });
}
