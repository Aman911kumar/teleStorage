import fs from "node:fs/promises";
import { MediaModel } from "../modules/media/media.model.js";
import { MediaProcessor } from "../modules/media/media.processor.js";
import { TelegramStorageProvider } from "../providers/telegram/TelegramStorageProvider.js";
import { WorkspaceService } from "../modules/workspaces/workspace.service.js";
import { trackTempFile, untrackTempFile } from "../utils/activeTempFiles.js";

export async function processVideoTranscoding(jobData: { mediaId: string; sourcePath: string; workspaceId: string }) {
  const processor = new MediaProcessor();
  const workspaceService = new WorkspaceService();
  const credentials = await workspaceService.getCredentialsById(jobData.workspaceId);
  const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
  const generatedPaths: string[] = [];
  trackTempFile(jobData.sourcePath);

  try {
    const processed = await processor.createVideoVariants(jobData.sourcePath);
    generatedPaths.push(...processed.variants.map((variant) => variant.path), processed.thumbnail.path);
    generatedPaths.forEach(trackTempFile);
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
  } catch (error) {
    await MediaModel.findByIdAndUpdate(jobData.mediaId, { status: "failed" }).catch(() => undefined);
    throw error;
  } finally {
    await Promise.all(
      [...generatedPaths, jobData.sourcePath].map(async (target) => {
        untrackTempFile(target);
        await fs.rm(target, { force: true }).catch(() => undefined);
      })
    );
  }
}
