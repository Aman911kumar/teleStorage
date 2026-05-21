import type { Response } from "express";
import { z } from "zod";
import { AppError } from "../../core/errors.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { MediaService } from "./media.service.js";

const mediaService = new MediaService();
const updateMediaSchema = z.object({
  folderId: z.string().nullable().optional(),
  originalName: z.string().min(1).max(180).optional()
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
  return {
    folderId: typeof req.body.folderId === "string" ? req.body.folderId : undefined,
    visibility: req.body.visibility === "public" ? ("public" as const) : ("private" as const),
    tags: parseJsonField<string[]>(req.body.tags, []),
    metadata: parseJsonField<Record<string, string>>(req.body.metadata, {})
  };
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
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    const kind = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("video/")
        ? "video"
        : req.file.mimetype.startsWith("audio/")
          ? "audio"
          : "document";
    res.status(kind === "video" ? 202 : 201).json({
      success: true,
      data: await mediaService.upload(req.file, req.user.id, kind, req.body.workspaceId, () => req.aborted || res.destroyed, uploadOptions(req))
    });
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await mediaService.recentUploads(req.user!.id) });
  };

  stream = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range);
  };

  view = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range, {
      requireAccess: false
    });
  };

  download = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range, { download: true });
  };

  thumbnail = async (req: AuthenticatedRequest, res: Response) => {
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
}
