import type { Response } from "express";
import { AppError } from "../../core/errors.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { MediaService } from "./media.service.js";

const mediaService = new MediaService();

export class MediaController {
  uploadImage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(201).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "image", req.body.workspaceId, () => req.aborted || res.destroyed) });
  };

  uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(202).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "video", req.body.workspaceId, () => req.aborted || res.destroyed) });
  };

  uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file || !req.user) throw new AppError("File is required", 400, "FILE_REQUIRED");
    res.status(201).json({ success: true, data: await mediaService.upload(req.file, req.user.id, "document", req.body.workspaceId, () => req.aborted || res.destroyed) });
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
      data: await mediaService.upload(req.file, req.user.id, kind, req.body.workspaceId, () => req.aborted || res.destroyed)
    });
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await mediaService.recentUploads(req.user!.id) });
  };

  stream = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.stream(req.params.id, res, req.user?.id, req.query.token as string | undefined, req.headers.range);
  };

  thumbnail = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.thumbnail(req.params.id, res, req.user?.id, req.query.token as string | undefined);
  };

  delete = async (req: AuthenticatedRequest, res: Response) => {
    await mediaService.delete(req.params.id, req.user!.id, req.user!.role);
    res.status(204).send();
  };

  bulkDelete = async (req: AuthenticatedRequest, res: Response) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const result = await mediaService.bulkDelete(ids, req.user!.id, req.user!.role);
    res.json({ success: true, data: result });
  };
}
