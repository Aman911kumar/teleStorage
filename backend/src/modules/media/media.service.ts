import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Response } from "express";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { env } from "../../config/env.js";
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
import { logger } from "../../utils/logger.js";
import { trackTempFile, untrackTempFile } from "../../utils/activeTempFiles.js";

type UploadKind = "image" | "video" | "audio" | "document";
type UploadOptions = {
  folderId?: string;
  folderPath?: string[] | string;
  tags?: string[];
  visibility?: "public" | "private";
  metadata?: Record<string, unknown>;
};
type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "webp" | "png" | "avif";
  fit?: "cover" | "contain" | "inside" | "outside";
};
const uploadLocks = new Map<string, Promise<void>>();
const cacheLocks = new Map<string, Promise<string>>();

function normalizeFolderPath(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split("/").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeCustomMetadata(metadata: Record<string, unknown> = {}) {
  const customMetadata = { ...metadata };
  delete customMetadata.folderPath;
  return customMetadata;
}

export class MediaService {
  private repository = new MediaRepository();
  private processor = new MediaProcessor();
  private workspaceService = new WorkspaceService();

  async upload(
    file: Express.Multer.File,
    userId: string,
    kind: UploadKind,
    workspaceId?: string,
    isAborted: () => boolean = () => false,
    options: UploadOptions = {}
  ) {
    if (!workspaceId) throw new AppError("workspaceId is required", 400, "WORKSPACE_REQUIRED");
    const sourcePath = await this.materializeUpload(file);
    const cleanupPaths = new Set<string>([sourcePath]);
    let releaseUploadLock: () => void = () => undefined;
    let lockKey: string | undefined;
    let uploadLock: Promise<void> | undefined;
    try {
      const credentials = await this.workspaceService.getTokenForUpload(userId, workspaceId);
      const storageLimitBytes = credentials.workspace.storageLimitBytes ?? 0;
      const projectedStorage = (credentials.workspace.storageUsed ?? 0) + file.size;
      if (storageLimitBytes > 0 && projectedStorage > storageLimitBytes) {
        throw new AppError("Workspace storage limit exceeded.", 413, "WORKSPACE_STORAGE_LIMIT_EXCEEDED");
      }
      const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
      const signature = await validateFileSignature(sourcePath, file.mimetype);
      const checksum = await sha256File(sourcePath);
      const duplicate = await this.repository.findByChecksum(checksum, workspaceId);
      if (duplicate) return this.toResponse(duplicate.id, true);
      const folderPath = normalizeFolderPath(options.folderPath ?? options.metadata?.folderPath);
      const customMetadata = normalizeCustomMetadata(options.metadata);

      lockKey = `${workspaceId}:${checksum}`;
      const activeUpload = uploadLocks.get(lockKey);
      if (activeUpload) {
        await activeUpload.catch(() => undefined);
        const duplicateAfterWait = await this.repository.findByChecksum(checksum, workspaceId);
        if (duplicateAfterWait) return this.toResponse(duplicateAfterWait.id, true);
      }

      let releaseLock!: () => void;
      uploadLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      uploadLocks.set(lockKey, uploadLock);
      releaseUploadLock = releaseLock;

      let uploadInput: UploadInput = {
        path: sourcePath,
        filename: file.filename || file.originalname,
        mimeType: signature.mime,
        kind
      };
      let thumbnail: Record<string, unknown> | undefined;

      if (kind === "image") {
        const processed = await this.processor.processImage(sourcePath);
        cleanupPaths.add(processed.main.path);
        cleanupPaths.add(processed.thumbnail.path);
        trackTempFile(processed.main.path);
        trackTempFile(processed.thumbnail.path);
        uploadInput = { ...processed.main, kind };
        await enqueueImageProcessing({ checksum });
      }

      if (isAborted()) throw new AppError("Upload was canceled.", 499, "UPLOAD_CANCELED");
      const stored = await storage.uploadFile(uploadInput);
      if (!stored.providerFileId) {
        throw new AppError("Telegram upload succeeded but file processing failed.", 502, "TELEGRAM_FILE_ID_MISSING");
      }
      if (kind === "image") {
        thumbnail = {
          label: "thumbnail",
          mimeType: uploadInput.mimeType,
          provider: stored.provider,
          providerFileId: stored.providerFileId,
          providerMessageId: stored.providerMessageId,
          size: stored.size
        };
      }

      if (isAborted()) throw new AppError("Upload was canceled.", 499, "UPLOAD_CANCELED");
      let duplicateRace = false;
      const media = await this.repository
        .create({
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
          folderId: options.folderId,
          uploadedBy: userId,
          visibility: options.visibility ?? "private",
          tags: options.tags ?? [],
          folderPath,
          customMetadata,
          metadata: {},
          variants: [],
          thumbnail,
          checksum,
          status: kind === "video" ? "processing" : "ready"
        })
        .catch(async (error: unknown) => {
          if ((error as { code?: number }).code !== 11000) throw error;
          await storage.deleteFile(stored.providerFileId, stored.providerMessageId).catch(() => undefined);
          const existing = await this.repository.findByChecksum(checksum, workspaceId);
          if (existing) {
            duplicateRace = true;
            return existing;
          }
          throw new AppError("This file already exists in your workspace.", 409, "DUPLICATE_MEDIA");
        });

      if (duplicateRace) return this.toResponse(media.id, true);

      await WorkspaceModel.findByIdAndUpdate(workspaceId, {
        $inc: {
          storageUsed: file.size,
          uploadCount: 1,
          imageCount: kind === "image" ? 1 : 0,
          videoCount: kind === "video" ? 1 : 0
        }
      });

      if (kind === "video") {
        cleanupPaths.delete(sourcePath);
        await enqueueVideoTranscoding({ mediaId: media.id, sourcePath, workspaceId });
        await enqueueThumbnail({ mediaId: media.id, sourcePath });
      }

      return this.toResponse(media.id, false);
    } finally {
      releaseUploadLock();
      if (lockKey && uploadLocks.get(lockKey) === uploadLock) uploadLocks.delete(lockKey);
      await Promise.all(
        [...cleanupPaths].map(async (target) => {
          untrackTempFile(target);
          await fs.rm(target, { force: true }).catch(() => undefined);
        })
      );
    }
  }

  async stream(
    mediaId: string,
    res: Response,
    userId?: string,
    token?: string,
    range?: string,
    options: {
      download?: boolean;
      thumbnail?: boolean;
      requireAccess?: boolean;
      ifNoneMatch?: string;
      transform?: ImageTransformOptions;
    } = {}
  ) {
    const media = await this.repository.findById(mediaId);
    if (!media || media.status === "deleted") throw new NotFoundError("Media not found");
    if (env.MEDIA_DEBUG_LOGS) {
      logger.info("Preparing media stream", {
        mediaId,
        provider: media.provider,
        providerFileId: media.providerFileId,
        mimeType: media.mimeType,
        visibility: media.visibility,
        status: media.status,
        range,
        download: Boolean(options.download),
        thumbnail: Boolean(options.thumbnail),
        transform: options.transform
      });
    }

    const shouldValidateAccess = options.requireAccess !== false;
    const publicOrOwner = media.visibility === "public" || String(media.uploadedBy) === userId;
    const transformScope = options.transform ? this.transformScope(options.transform) : undefined;
    if (shouldValidateAccess && !publicOrOwner && !verifySignedToken(mediaId, token, transformScope)) {
      throw new ForbiddenError("Media is private");
    }

    if (!media.workspaceId) throw new AppError("Media is missing workspace credentials.", 500, "WORKSPACE_REQUIRED");
    const credentials = await this.workspaceService.getCredentialsById(String(media.workspaceId));
    const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
    const target = options.thumbnail && media.thumbnail?.providerFileId
      ? {
          providerFileId: media.thumbnail.providerFileId,
          mimeType: media.thumbnail.mimeType ?? "image/jpeg"
        }
      : {
          providerFileId: media.providerFileId,
          mimeType: media.mimeType
        };

    const etag = `"${media.checksum}"`;
    if (options.ifNoneMatch === etag && !options.download) {
      res.status(304).end();
      return;
    }

    const cacheControl = media.visibility === "public" && !options.download
      ? "public, max-age=86400, stale-while-revalidate=604800"
      : "private, max-age=60";
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", options.thumbnail ? "public, max-age=3600, stale-while-revalidate=86400" : cacheControl);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", target.mimeType);
    res.setHeader("Content-Disposition", `${options.download ? "attachment" : "inline"}; filename="${encodeURIComponent(media.originalName)}"`);
    if (env.MEDIA_DEBUG_LOGS) {
      logger.info("Media response base headers prepared", {
        mediaId,
        contentType: target.mimeType,
        cacheControl: res.getHeader("Cache-Control"),
        acceptRanges: res.getHeader("Accept-Ranges"),
        contentDisposition: res.getHeader("Content-Disposition")
      });
    }

    if (options.thumbnail) {
      const cachePath = await this.ensureCached(mediaId, target.providerFileId, storage, "thumb");
      await this.pipeCachedFile(cachePath, target.mimeType, res, range);
      return;
    }

    if (options.transform) {
      if (!media.mimeType.startsWith("image/")) throw new AppError("Image transformations are only supported for images.", 400, "TRANSFORM_NOT_SUPPORTED");
      const transformed = await this.ensureTransformed(mediaId, target.providerFileId, storage, options.transform);
      await this.pipeCachedFile(transformed.path, transformed.mimeType, res, range);
      return;
    }

    await this.pipeProviderStream(storage, target.providerFileId, target.mimeType, res, range);
  }

  async thumbnail(mediaId: string, res: Response, userId?: string, token?: string) {
    return this.stream(mediaId, res, userId, token, undefined, { thumbnail: true });
  }

  async delete(mediaId: string, userId: string, role: string) {
    const media = await this.repository.findById(mediaId);
    if (!media) throw new NotFoundError("Media not found");
    if (String(media.uploadedBy) !== userId && role !== "admin") throw new ForbiddenError();
    const workspaceId = media.workspaceId ? String(media.workspaceId) : undefined;
    if (media.status === "deleted") {
      await this.repository.purgeById(mediaId);
      if (workspaceId) await this.syncWorkspaceUsage(workspaceId);
      await fs.rm(path.join(env.LOCAL_CACHE_DIR, mediaId), { recursive: true, force: true }).catch(() => undefined);
      return;
    }
    if (workspaceId) {
      const credentials = await this.workspaceService.getCredentialsById(String(media.workspaceId));
      const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
      const messageIds = new Set<string>();
      if (media.providerMessageId) messageIds.add(String(media.providerMessageId));
      if (media.thumbnail?.providerMessageId) messageIds.add(String(media.thumbnail.providerMessageId));
      for (const variant of media.variants ?? []) {
        if (variant.providerMessageId) messageIds.add(String(variant.providerMessageId));
      }

      await Promise.all([...messageIds].map((messageId) => storage.deleteFile(media.providerFileId, messageId)));
    }
    await this.repository.deleteById(mediaId);
    if (workspaceId) await this.syncWorkspaceUsage(workspaceId);
    await fs.rm(path.join(env.LOCAL_CACHE_DIR, mediaId), { recursive: true, force: true }).catch(() => undefined);
  }

  async bulkDelete(ids: string[], userId: string, role: string) {
    return this.repository.deleteMany(ids, role === "admin" ? undefined : userId);
  }

  async restore(mediaId: string, userId: string) {
    const media = await this.repository.restoreById(mediaId, userId);
    if (!media) throw new NotFoundError("Media not found");
    if (media.workspaceId) await this.syncWorkspaceUsage(String(media.workspaceId));
    return media;
  }

  async bulkRestore(ids: string[], userId: string) {
    const result = await this.repository.restoreMany(ids, userId);
    const restored = result.modifiedCount ?? 0;
    return { restored };
  }

  async analytics() {
    return this.repository.analytics();
  }

  async failedUploads() {
    return this.repository.failedUploads();
  }

  async syncTelegram(workspaceId: string, userId: string) {
    const credentials = await this.workspaceService.getTokenForUpload(userId, workspaceId);
    const storage = new TelegramStorageProvider(credentials.botToken, credentials.channelId);
    const media = await this.repository.listForWorkspaceOwner(workspaceId, userId);
    const removed: string[] = [];
    const checked: string[] = [];

    for (const item of media) {
      checked.push(item.id);
      if (item.status === "deleted") {
        await this.repository.purgeById(item.id);
        removed.push(item.id);
        continue;
      }
      const exists = await storage.fileExists(item.providerFileId);
      if (!exists) {
        await this.repository.purgeById(item.id);
        removed.push(item.id);
      }
    }

    if (removed.length) await this.syncWorkspaceUsage(workspaceId);
    return { checked: checked.length, removed: removed.length, removedIds: removed };
  }

  async recentUploads(userId: string, includeDeleted = false) {
    const media = await this.repository.recent(userId, 100, { includeDeleted });
    return media.map((item) => {
      const object = item.toObject();
      const token = createSignedToken(item.id);
      return {
        ...object,
        viewUrl: `/media/${item.id}/view?token=${token}`,
        downloadUrl: `/media/${item.id}/download?token=${token}`,
        thumbUrl: `/media/${item.id}/thumb?token=${token}`
      };
    });
  }

  async move(mediaId: string, userId: string, folderId?: string | null) {
    const media = await this.repository.updateOrganization(mediaId, userId, { folderId: folderId || null });
    if (!media) throw new NotFoundError("Media not found");
    return media;
  }

  async rename(mediaId: string, userId: string, originalName: string) {
    const name = originalName.trim();
    if (!name) throw new AppError("Filename is required.", 400, "FILENAME_REQUIRED");
    const media = await this.repository.updateOrganization(mediaId, userId, { originalName: name });
    if (!media) throw new NotFoundError("Media not found");
    return media;
  }

  async listForWorkspace(workspaceId: string, options: { folderId?: string; limit?: number } = {}) {
    return this.repository.listForWorkspace(workspaceId, options);
  }

  async findForWorkspace(mediaId: string, workspaceId: string) {
    const media = await this.repository.findByIdForWorkspace(mediaId, workspaceId);
    if (!media) throw new NotFoundError("Media not found");
    return media;
  }

  private toResponse(mediaId: string, duplicate: boolean) {
    const token = createSignedToken(mediaId);
    return {
      id: mediaId,
      duplicate,
      url: `/media/${mediaId}`,
      signedUrl: `/media/${mediaId}/view?token=${token}`,
      viewUrl: `/media/${mediaId}/view?token=${token}`,
      downloadUrl: `/media/${mediaId}/download?token=${token}`,
      thumbUrl: `/media/${mediaId}/thumb?token=${token}`
    };
  }

  private cachePath(mediaId: string, providerFileId: string, variant: string) {
    const safeProviderId = providerFileId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(env.LOCAL_CACHE_DIR, mediaId, `${variant}-${safeProviderId}`);
  }

  createSignedLinks(mediaId: string, expiresInSeconds: number, transform?: ImageTransformOptions) {
    const normalizedTransform = transform ? this.normalizeTransform(transform) : undefined;
    const query = normalizedTransform ? `&${new URLSearchParams(this.transformQuery(normalizedTransform)).toString()}` : "";
    const scope = normalizedTransform ? this.transformScope(normalizedTransform) : undefined;
    const token = createSignedToken(mediaId, expiresInSeconds, scope);
    return {
      expiresInSeconds,
      viewUrl: `/media/${mediaId}/view?token=${token}${query}`,
      downloadUrl: `/media/${mediaId}/download?token=${token}`,
      thumbnailUrl: `/media/${mediaId}/thumb?token=${token}`
    };
  }

  private async materializeUpload(file: Express.Multer.File) {
    await fs.mkdir(env.UPLOAD_TMP_DIR, { recursive: true });
    if (file.path) {
      const safeName = file.originalname.replace(/[\\/]+/g, "-").replace(/\s+/g, "_");
      const target = path.join(env.UPLOAD_TMP_DIR, `processing-${Date.now()}-${nanoid()}-${safeName}`);
      try {
        await fs.access(file.path);
        trackTempFile(target);
        try {
          await fs.rename(file.path, target);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
          await pipeline(createReadStream(file.path), createWriteStream(target));
          await fs.rm(file.path, { force: true });
        }
        untrackTempFile(file.path);
        return target;
      } catch (error) {
        untrackTempFile(target);
        await fs.rm(target, { force: true }).catch(() => undefined);
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          logger.warn("Upload temp file disappeared before processing", {
            originalName: file.originalname,
            path: file.path
          });
        }
        throw new AppError("Upload temp file was not available. Please retry the upload.", 400, "UPLOAD_TEMP_FILE_MISSING");
      }
    }

    if (!file.buffer?.length) {
      throw new AppError("Uploaded file is empty or unavailable. Please retry.", 400, "UPLOAD_FILE_UNAVAILABLE");
    }

    const safeName = file.originalname.replace(/[\\/]+/g, "-");
    const target = path.join(env.UPLOAD_TMP_DIR, `${Date.now()}-${nanoid()}-${safeName}`);
    trackTempFile(target);
    try {
      await fs.writeFile(target, file.buffer);
      return target;
    } catch (error) {
      untrackTempFile(target);
      await fs.rm(target, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private async syncWorkspaceUsage(workspaceId: string) {
    const [stats] = await this.repository.workspaceStats(workspaceId);
    await WorkspaceModel.findByIdAndUpdate(workspaceId, {
      storageUsed: stats?.storageUsed ?? 0,
      uploadCount: stats?.uploadCount ?? 0,
      imageCount: stats?.imageCount ?? 0,
      videoCount: stats?.videoCount ?? 0
    });
  }

  private async ensureCached(mediaId: string, providerFileId: string, storage: TelegramStorageProvider, variant: string) {
    const target = this.cachePath(mediaId, providerFileId, variant);
    try {
      const stat = await fs.stat(target);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > env.CACHE_TTL_SECONDS * 1000) {
        await fs.rm(target, { force: true });
        throw new Error("cache expired");
      }
      return target;
    } catch {
      // Cache miss.
    }

    const lockKey = `${mediaId}:${variant}:${providerFileId}`;
    const active = cacheLocks.get(lockKey);
    if (active) return active;

    const promise = (async () => {
      await fs.mkdir(path.dirname(target), { recursive: true });
      const tempPath = `${target}.tmp-${Date.now()}`;
      const providerStream = await storage.streamFile(providerFileId);
      await pipeline(providerStream.stream, createWriteStream(tempPath));
      await fs.rename(tempPath, target);
      return target;
    })().finally(() => cacheLocks.delete(lockKey));

    cacheLocks.set(lockKey, promise);
    return promise;
  }

  private normalizeTransform(input: ImageTransformOptions) {
    const width = input.width ? Math.min(Math.max(Math.floor(input.width), 1), 4096) : undefined;
    const height = input.height ? Math.min(Math.max(Math.floor(input.height), 1), 4096) : undefined;
    const quality = Math.min(Math.max(Math.floor(input.quality ?? 82), 1), 100);
    const format = input.format ?? "webp";
    const fit = input.fit ?? "inside";
    return { width, height, quality, format, fit };
  }

  private transformQuery(transform: Required<Pick<ImageTransformOptions, "quality" | "format" | "fit">> & Pick<ImageTransformOptions, "width" | "height">) {
    return Object.fromEntries(
      Object.entries({
        w: transform.width ? String(transform.width) : undefined,
        h: transform.height ? String(transform.height) : undefined,
        q: String(transform.quality),
        format: transform.format,
        fit: transform.fit
      }).filter(([, value]) => value)
    ) as Record<string, string>;
  }

  private transformScope(transform: ImageTransformOptions) {
    const normalized = this.normalizeTransform(transform);
    return JSON.stringify(this.transformQuery(normalized));
  }

  private async ensureTransformed(mediaId: string, providerFileId: string, storage: TelegramStorageProvider, transform: ImageTransformOptions) {
    const normalized = this.normalizeTransform(transform);
    const variant = `transform-${normalized.width ?? "auto"}x${normalized.height ?? "auto"}-${normalized.fit}-${normalized.format}-q${normalized.quality}`;
    const target = this.cachePath(mediaId, providerFileId, variant);
    try {
      const stat = await fs.stat(target);
      if (Date.now() - stat.mtimeMs <= env.CACHE_TTL_SECONDS * 1000) {
        return { path: target, mimeType: `image/${normalized.format}` };
      }
      await fs.rm(target, { force: true });
    } catch {
      // Cache miss.
    }

    const lockKey = `${mediaId}:${variant}:${providerFileId}`;
    const active = cacheLocks.get(lockKey);
    if (active) return { path: await active, mimeType: `image/${normalized.format}` };

    const promise = (async () => {
      await fs.mkdir(path.dirname(target), { recursive: true });
      const tempPath = `${target}.tmp-${Date.now()}`;
      const providerStream = await storage.streamFile(providerFileId);
      const transformer = sharp()
        .rotate()
        .resize({ width: normalized.width, height: normalized.height, fit: normalized.fit, withoutEnlargement: true })
        .toFormat(normalized.format, { quality: normalized.quality });
      await pipeline(providerStream.stream, transformer, createWriteStream(tempPath));
      await fs.rename(tempPath, target);
      return target;
    })().finally(() => cacheLocks.delete(lockKey));

    cacheLocks.set(lockKey, promise);
    return { path: await promise, mimeType: `image/${normalized.format}` };
  }

  private async pipeProviderStream(
    storage: TelegramStorageProvider,
    providerFileId: string,
    contentType: string,
    res: Response,
    range?: string
  ) {
    const providerStream = await storage.streamFile(providerFileId, range);
    if (providerStream.statusCode) res.status(providerStream.statusCode === 206 ? 206 : 200);
    if (providerStream.contentType) res.setHeader("Content-Type", contentType || providerStream.contentType);
    if (providerStream.contentLength) res.setHeader("Content-Length", providerStream.contentLength);
    if (providerStream.contentRange) res.setHeader("Content-Range", providerStream.contentRange);
    if (env.MEDIA_DEBUG_LOGS) {
      logger.info("Proxying Telegram stream to browser", {
        providerFileId,
        requestedRange: range,
        responseStatus: res.statusCode,
        contentType: res.getHeader("Content-Type"),
        contentLength: res.getHeader("Content-Length"),
        contentRange: res.getHeader("Content-Range"),
        cacheControl: res.getHeader("Cache-Control"),
        acceptRanges: res.getHeader("Accept-Ranges"),
        contentDisposition: res.getHeader("Content-Disposition")
      });
    }

    const onClose = () => providerStream.stream.destroy();
    res.once("close", onClose);
    try {
      await pipeline(providerStream.stream, res);
    } catch (error) {
      if (!res.destroyed) {
        logger.error("Telegram proxy stream failed", {
          providerFileId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      res.off("close", onClose);
    }
  }

  private async pipeCachedFile(filePath: string, contentType: string, res: Response, range?: string) {
    const stat = await fs.stat(filePath);
    if (!range) {
      res.status(200);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stat.size);
      if (env.MEDIA_DEBUG_LOGS) {
        logger.info("Streaming cached media file", {
          filePath,
          contentType,
          contentLength: stat.size,
          responseStatus: 200
        });
      }
      await pipeline(createReadStream(filePath), res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).send();
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    if (start >= stat.size || end >= stat.size || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).send();
      return;
    }

    res.status(206);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", end - start + 1);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    if (env.MEDIA_DEBUG_LOGS) {
      logger.info("Streaming cached media file range", {
        filePath,
        contentType,
        contentLength: end - start + 1,
        contentRange: `bytes ${start}-${end}/${stat.size}`,
        responseStatus: 206
      });
    }
    await pipeline(createReadStream(filePath, { start, end }), res);
  }
}
