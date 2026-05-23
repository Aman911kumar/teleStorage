import type { Response } from "express";
import { z } from "zod";
import { AppError } from "../../core/errors.js";
import { env } from "../../config/env.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { logger } from "../../utils/logger.js";
import { MediaService } from "./media.service.js";

const mediaService = new MediaService();
const updateMediaSchema = z.object({
  folderId: z.string().nullable().optional(),
  originalName: z.string().min(1).max(180).optional()
});

const transformSchema = z.object({
  width: z.coerce.number().int().positive().max(4096).optional(),
  height: z.coerce.number().int().positive().max(4096).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
  format: z.enum(["jpeg", "webp", "png", "avif"]).optional(),
  fit: z.enum(["cover", "contain", "inside", "outside"]).optional()
});

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function uploadOptions(req: AuthenticatedRequest) {
  const metadata = parseJsonField<Record<string, unknown>>(req.body.metadata, {});
  return {
    folderId: typeof req.body.folderId === "string" ? req.body.folderId : undefined,
    folderPath: parseJsonField<string[] | string>(req.body.folderPath, (metadata.folderPath as string[] | string | undefined) ?? []),
    visibility: req.body.visibility === "public" ? ("public" as const) : ("private" as const),
    tags: parseJsonField<string[]>(req.body.tags, []),
    metadata
  };
}

function imageTransform(req: AuthenticatedRequest) {
  const width = req.query.w ?? req.query.width;
  const height = req.query.h ?? req.query.height;
  const quality = req.query.q ?? req.query.quality;
  const raw = {
    width,
    height,
    quality,
    format: req.query.format,
    fit: req.query.fit
  };
  const hasTransform = Object.values(raw).some((value) => value !== undefined);
  return hasTransform ? transformSchema.parse(raw) : undefined;
}

function ifNoneMatch(req: AuthenticatedRequest) {
  const value = req.headers["if-none-match"];
  return Array.isArray(value) ? value[0] : value;
}

function requestBaseUrl(req: AuthenticatedRequest) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}`;
}

function logMediaRequest(req: AuthenticatedRequest, mode: "stream" | "view" | "download" | "thumbnail") {
  if (!env.MEDIA_DEBUG_LOGS) return;
  logger.info("Media request received", {
    mode,
    mediaId: req.params.id,
    method: req.method,
    url: req.originalUrl,
    baseUrl: requestBaseUrl(req),
    range: req.headers.range,
    userAgent: req.get("user-agent"),
    origin: req.get("origin"),
    referer: req.get("referer")
  });
}

export class MediaController {
  uploadImage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(201).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "image", req.body.workspaceId, () => req.aborted || res.destroyed, uploadOptions(req)) });
  };

  uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(202).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "video", req.body.workspaceId, () => req.aborted || res.destroyed, uploadOptions(req)) });
  };

  uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(201).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "document", req.body.workspaceId, () => req.aborted || res.destroyed, uploadOptions(req)) });
  };

  uploadAny = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) throw new AppError("File is required", 400, "FILE_REQUIRED");
    const ownerId = req.apiWorkspace?.ownerId ?? req.user?.id;
    const workspaceId = req.apiWorkspace?.id ?? req.body.workspaceId;
    if (!ownerId) throw new AppError("Valid dashboard session or API credentials are required", 403, "UPLOAD_AUTH_REQUIRED");
    const kind = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("video/")
        ? "video"
        : req.file.mimetype.startsWith("audio/")
          ? "audio"
          : "document";
    res.status(kind === "video" ? 202 : 201).json({
      success: true,
      data: await mediaService.upload(req.file, ownerId, kind, workspaceId, () => req.aborted || res.destroyed, uploadOptions(req))
    });
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await mediaService.recentUploads(req.user!.id, req.query.includeDeleted === "true") });
  };

  stream = async (req: AuthenticatedRequest, res: Response) => {
    logMediaRequest(req, "stream");
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range, {
      ifNoneMatch: ifNoneMatch(req),
      transform: imageTransform(req)
    });
  };

  view = async (req: AuthenticatedRequest, res: Response) => {
    logMediaRequest(req, "view");
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range, {
      requireAccess: false,
      ifNoneMatch: ifNoneMatch(req),
      transform: imageTransform(req)
    });
  };

  download = async (req: AuthenticatedRequest, res: Response) => {
    logMediaRequest(req, "download");
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range, {
      download: true,
      ifNoneMatch: ifNoneMatch(req)
    });
  };

  thumbnail = async (req: AuthenticatedRequest, res: Response) => {
    logMediaRequest(req, "thumbnail");
    await mediaService.thumbnail(req.params.id, res, req.user?.id, req.query.token as string | undefined);
  };

  delete = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.delete(req.params.id, req.user!.id, req.user!.role);
    res.status(204).send();
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    const body = updateMediaSchema.parse(req.body);
    const data = body.originalName
      ? await mediaService.rename(req.params.id, req.user!.id, body.originalName)
      : await mediaService.move(req.params.id, req.user!.id, body.folderId);
    res.json({ success: true, data });
  };

  bulkDelete = async (req: AuthenticatedRequest, res: Response) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const result = await mediaService.bulkDelete(ids, req.user!.id, req.user!.role);
    res.json({ success: true, data: result });
  };

  restore = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await mediaService.restore(req.params.id, req.user!.id) });
  };

  bulkRestore = async (req: AuthenticatedRequest, res: Response) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    res.json({ success: true, data: await mediaService.bulkRestore(ids, req.user!.id) });
  };
}
