import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";
import { MediaModel } from "../modules/media/media.model.js";
import { WorkspaceModel } from "../modules/workspaces/workspace.model.js";
import { FolderModel } from "../modules/folders/folder.model.js";
import { ApiKeyModel } from "../modules/api-keys/api-key.model.js";
import { ApiRequestLogModel } from "../modules/api-logs/api-request-log.model.js";
import { WebhookModel } from "../modules/webhooks/webhook.model.js";
import { generatePublicProjectId, generateUploadToken, hashUploadToken } from "../utils/apiTokens.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  await backfillWorkspaceApiAccess();
  await reconcileMediaIndexes();
  await WorkspaceModel.createIndexes();
  await FolderModel.createIndexes();
  await ApiKeyModel.createIndexes();
  await ApiRequestLogModel.createIndexes();
  await WebhookModel.createIndexes();
  logger.info("MongoDB connected");
}

async function backfillWorkspaceApiAccess() {
  const workspaces = await WorkspaceModel.find({
    $or: [{ publicProjectId: { $exists: false } }, { uploadTokenHash: { $exists: false } }, { storageLimitBytes: { $exists: false } }]
  });

  for (const workspace of workspaces) {
    if (!workspace.publicProjectId) workspace.publicProjectId = generatePublicProjectId();
    if (!workspace.uploadTokenHash) workspace.uploadTokenHash = hashUploadToken(generateUploadToken());
    if (typeof workspace.storageLimitBytes !== "number") {
      workspace.storageLimitBytes = env.DEFAULT_WORKSPACE_STORAGE_LIMIT_GB > 0 ? env.DEFAULT_WORKSPACE_STORAGE_LIMIT_GB * 1024 * 1024 * 1024 : 0;
    }
    await workspace.save();
  }

  if (workspaces.length) {
    logger.info("Backfilled workspace API access fields", { count: workspaces.length });
  }
}

async function reconcileMediaIndexes() {
  try {
    await MediaModel.collection.dropIndex("checksum_1");
    logger.info("Dropped old global checksum index");
  } catch (error) {
    const codeName = (error as { codeName?: string }).codeName;
    const code = (error as { code?: number }).code;
    if (codeName !== "IndexNotFound" && code !== 27 && code !== 26) {
      logger.warn("Unable to drop old checksum index", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await MediaModel.createIndexes();
}
