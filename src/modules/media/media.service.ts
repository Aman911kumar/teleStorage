import fs from "node:fs/promises";
import type { Response } from "express";
import { createStorageProvider } from "../../providers/index.js";
import type { UploadInput } from "../../providers/storage.types.js";
import { AppError, ForbiddenError, NotFoundError } from "../../core/errors.js";
import { createSignedToken, verifySignedToken } from "../../utils/signing.js";
import { sha256File } from "../../utils/checksum.js";
import { validateFileSignature } from "../../utils/fileValidation.js";
import { MediaRepository } from "./media.repository.js";
import { MediaProcessor } from "./media.processor.js";
import { enqueueImageProcessing, enqueueThumbnail, enqueueVideoTranscoding } from "../../queues/media.queues.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";
import { WorkspaceService } from "../workspaces/workspace.service.js";
import { TelegramStorageProvider } from "../../providers/telegram/TelegramStorageProvider.js";

type UploadKind = "image" | "video" | "audio" | "document";

export class MediaService {
  private repository = new MediaRepository();
  private storage = createStorageProvider();
  private processor = new MediaProcessor();
  private workspaceService = new WorkspaceService();

  async upload(
    file: Express.Multer.File,
    userId: string,
    kind: UploadKind,
    workspaceId?: string,
    isAborted: () => boolean = () => false
  ) {
    if (!workspaceId) throw new AppError("workspaceId is required", 400, "WORKSPACE_REQUIRED");
    const cleanupPaths = new Set<string>([file.path]);
    try {
      const credentials = await this.workspaceService.getTokenForUpload(userId, workspaceId);
      const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
      const signature = await validateFileSignature(file.path, file.mimetype);
      const checksum = await sha256File(file.path);
      const duplicate = await this.repository.findByChecksum(checksum, userId);
      if (duplicate) return this.toResponse(duplicate.id, true);

      let uploadInput: UploadInput = {
        path: file.path,
        filename: file.filename,
        mimeType: signature.mime,
        kind
      };
      let thumbnail: Record<string, unknown> | undefined;

      if (kind === "image") {
        const processed = await this.processor.processImage(file.path);
        cleanupPaths.add(processed.main.path);
        cleanupPaths.add(processed.thumbnail.path);
        uploadInput = { ...processed.main, kind };
        const thumbUpload = await storage.uploadFile({ ...processed.thumbnail, kind: "thumbnail" });
        thumbnail = { ...processed.thumbnail, label: "thumbnail", ...thumbUpload };
        await enqueueImageProcessing({ checksum });
      }

      if (isAborted()) throw new AppError("Upload was canceled.", 499, "UPLOAD_CANCELED");
      const stored = await storage.uploadFile(uploadInput);
      if (!stored.providerFileId) {
        throw new AppError("Telegram upload succeeded but file processing failed.", 502, "TELEGRAM_FILE_ID_MISSING");
      }

      if (isAborted()) throw new AppError("Upload was canceled.", 499, "UPLOAD_CANCELED");
      const media = await this.repository.create({
        originalName: file.originalname,
        filename: uploadInput.filename,
        mimeType: uploadInput.mimeType,
        size: file.size,
        provider: stored.provider,
        providerFileId: stored.providerFileId,
        providerMessageId: stored.providerMessageId,
        workspaceId,
        telegramFileId: stored.providerFileId,
        telegramMessageId: stored.providerMessageId,
        mediaType: kind,
        uploadedBy: userId,
        visibility: "private",
        tags: [],
        metadata: {},
        variants: [],
        thumbnail,
        checksum,
        status: kind === "video" ? "processing" : "ready"
      });

      await WorkspaceModel.findByIdAndUpdate(workspaceId, {
        $inc: {
          storageUsed: file.size,
          uploadCount: 1,
          imageCount: kind === "image" ? 1 : 0,
          videoCount: kind === "video" ? 1 : 0
        }
      });

      if (kind === "video") {
        cleanupPaths.delete(file.path);
        await enqueueVideoTranscoding({ mediaId: media.id, sourcePath: file.path });
        await enqueueThumbnail({ mediaId: media.id, sourcePath: file.path });
      }

      return this.toResponse(media.id, false);
    } finally {
      await Promise.all([...cleanupPaths].map((target) => fs.rm(target, { force: true }).catch(() => undefined)));
    }
  }

  async stream(mediaId: string, res: Response, userId?: string, token?: string, range?: string) {
    const media = await this.repository.findById(mediaId);
    if (!media || media.status === "deleted") throw new NotFoundError("Media not found");
    const publicOrOwner = media.visibility === "public" || String(media.uploadedBy) === userId;
    if (!publicOrOwner && !verifySignedToken(mediaId, token)) {
      throw new ForbiddenError("Media is private");
    }

    const credentials = media.workspaceId
      ? await this.workspaceService.getCredentialsById(String(media.workspaceId))
      : undefined;
    const storage = credentials ? new TelegramStorageProvider(credentials.botToken, credentials.channelId) : this.storage;
    const providerStream = await storage.streamFile(media.providerFileId, range);
    const etag = `"${media.checksum}"`;
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", media.visibility === "public" ? "public, max-age=31536000, immutable" : "private, max-age=60");
    res.setHeader("Accept-Ranges", "bytes");
    if (providerStream.contentType) res.setHeader("Content-Type", providerStream.contentType);
    if (providerStream.contentLength) res.setHeader("Content-Length", providerStream.contentLength);
    if (providerStream.contentRange) res.setHeader("Content-Range", providerStream.contentRange);
    if (range) res.status(providerStream.statusCode === 206 ? 206 : 200);
    providerStream.stream.pipe(res);
  }

  async thumbnail(mediaId: string, res: Response, userId?: string, token?: string) {
    const media = await this.repository.findById(mediaId);
    if (!media?.thumbnail?.providerFileId) throw new NotFoundError("Thumbnail not found");
    if (media.visibility !== "public" && String(media.uploadedBy) !== userId && !verifySignedToken(mediaId, token)) {
      throw new ForbiddenError("Media is private");
    }
    const credentials = media.workspaceId
      ? await this.workspaceService.getCredentialsById(String(media.workspaceId))
      : undefined;
    const storage = credentials ? new TelegramStorageProvider(credentials.botToken, credentials.channelId) : this.storage;
    const providerStream = await storage.streamFile(media.thumbnail.providerFileId);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", providerStream.contentType ?? "image/webp");
    providerStream.stream.pipe(res);
  }

  async delete(mediaId: string, userId: string, role: string) {
    const media = await this.repository.findById(mediaId);
    if (!media) throw new NotFoundError("Media not found");
    if (String(media.uploadedBy) !== userId && role !== "admin") throw new ForbiddenError();
    await this.storage.deleteFile(media.providerFileId, media.providerMessageId ?? undefined);
    await this.repository.markDeleted(mediaId);
  }

  async bulkDelete(ids: string[], userId: string, role: string) {
    return this.repository.deleteMany(ids, role === "admin" ? undefined : userId);
  }

  async analytics() {
    return this.repository.analytics();
  }

  async failedUploads() {
    return this.repository.failedUploads();
  }

  async recentUploads(userId: string) {
    return this.repository.recent(userId);
  }

  private toResponse(mediaId: string, duplicate: boolean) {
    return {
      id: mediaId,
      duplicate,
      url: `/media/${mediaId}`,
      signedUrl: `/media/${mediaId}?token=${createSignedToken(mediaId)}`
    };
  }
}
