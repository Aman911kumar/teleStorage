import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireWorkspaceUploadToken } from "../../middlewares/apiAccess.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { uploadRateLimit } from "../../middlewares/rateLimit.js";
import { apiRequestLogger } from "../../middlewares/apiRequestLog.middleware.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { MediaService } from "../media/media.service.js";
import { FolderService } from "../folders/folder.service.js";
import { AppError, ForbiddenError } from "../../core/errors.js";

const mediaService = new MediaService();
const folderService = new FolderService();

const folderSchema = z.object({
  name: z.string().min(1).max(80),
  parentId: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

const updateMediaSchema = z.object({
  folderId: z.string().nullable().optional(),
  originalName: z.string().min(1).max(180).optional()
});

const signedLinkSchema = z.object({
  expiresInSeconds: z.coerce.number().int().min(60).max(604800).default(900),
  transform: z
    .object({
      width: z.coerce.number().int().positive().max(4096).optional(),
      height: z.coerce.number().int().positive().max(4096).optional(),
      quality: z.coerce.number().int().min(1).max(100).optional(),
      format: z.enum(["jpeg", "webp", "png", "avif"]).optional(),
      fit: z.enum(["cover", "contain", "inside", "outside"]).optional()
    })
    .optional()
});

function filesFromRequest(req: AuthenticatedRequest) {
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat() as Express.Multer.File[];
  }
  return req.file ? [req.file] : [];
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function kindFromMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function requireApiScope(req: AuthenticatedRequest, scope: "upload" | "read" | "write" | "delete") {
  const scopes = req.apiWorkspace?.scopes;
  if (!scopes?.length) return;
  if (scopes.includes("full") || scopes.includes(scope)) return;
  throw new ForbiddenError(`API key does not have ${scope} access`);
}

export const apiV1Router = Router();

apiV1Router.use("/api/v1", apiRequestLogger);
apiV1Router.use("/api/v1", requireWorkspaceUploadToken);

apiV1Router.post(
  "/api/v1/upload",
  uploadRateLimit,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 10 }
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "upload");
    const files = filesFromRequest(req);
    if (!files.length) throw new AppError("File is required", 400, "FILE_REQUIRED");

    const tags = parseJsonField<string[]>(req.body.tags, []);
    const metadata = parseJsonField<Record<string, string>>(req.body.metadata, {});
    const visibility = req.body.visibility === "public" ? "public" : "private";
    const folderId = typeof req.body.folderId === "string" ? req.body.folderId : undefined;
    const customFilename = typeof req.body.filename === "string" ? req.body.filename : undefined;
    const workspace = req.apiWorkspace!;

    const uploaded = [];
    for (const file of files) {
      uploaded.push(
        await mediaService.upload(file, workspace.ownerId, kindFromMime(file.mimetype), workspace.id, () => req.aborted || res.destroyed, {
          folderId,
          tags,
          metadata,
          visibility
        })
      );
      if (customFilename) {
        await mediaService.rename(uploaded[uploaded.length - 1].id, workspace.ownerId, customFilename);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        files: uploaded.map((item) => ({
          ...item,
          publicUrl: `/media/${item.id}/view`,
          apiUrl: `/api/v1/media/${item.id}`
        }))
      }
    });
  })
);

apiV1Router.patch(
  "/api/v1/media/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "write");
    await mediaService.findForWorkspace(req.params.id, req.apiWorkspace!.id);
    const body = updateMediaSchema.parse(req.body);
    const data = body.originalName
      ? await mediaService.rename(req.params.id, req.apiWorkspace!.ownerId, body.originalName)
      : await mediaService.move(req.params.id, req.apiWorkspace!.ownerId, body.folderId);
    res.json({ success: true, data });
  })
);

apiV1Router.get(
  "/api/v1/media/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const media = await mediaService.findForWorkspace(req.params.id, req.apiWorkspace!.id);
    res.json({
      success: true,
      data: {
        id: media.id,
        originalName: media.originalName,
        filename: media.filename,
        mimeType: media.mimeType,
        size: media.size,
        visibility: media.visibility,
        tags: media.tags,
        folderId: media.folderId,
        metadata: media.customMetadata,
        status: media.status,
        publicUrl: `/media/${media.id}/view`,
        apiUrl: `/api/v1/media/${media.id}`,
        createdAt: media.createdAt
      }
    });
  })
);

apiV1Router.head(
  "/api/v1/media/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const media = await mediaService.findForWorkspace(req.params.id, req.apiWorkspace!.id);
    res
      .setHeader("Content-Type", media.mimeType)
      .setHeader("Content-Length", String(media.size))
      .setHeader("ETag", `"${media.checksum}"`)
      .status(200)
      .send();
  })
);

apiV1Router.post(
  "/api/v1/media/:id/links",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const media = await mediaService.findForWorkspace(req.params.id, req.apiWorkspace!.id);
    const body = signedLinkSchema.parse(req.body);
    res.json({ success: true, data: mediaService.createSignedLinks(media.id, body.expiresInSeconds, body.transform) });
  })
);

apiV1Router.delete(
  "/api/v1/media/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "delete");
    await mediaService.findForWorkspace(req.params.id, req.apiWorkspace!.id);
    await mediaService.delete(req.params.id, req.apiWorkspace!.ownerId, "user");
    res.status(204).send();
  })
);

apiV1Router.get(
  "/api/v1/files",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const files = await mediaService.listForWorkspace(req.apiWorkspace!.id, {
      folderId: req.query.folderId as string | undefined,
      limit: Number(req.query.limit) || 100
    });
    res.json({ success: true, data: files });
  })
);

apiV1Router.get(
  "/api/v1/search",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const query = String(req.query.q ?? "").toLowerCase();
    const files = await mediaService.listForWorkspace(req.apiWorkspace!.id, { limit: Number(req.query.limit) || 100 });
    const results = files.filter((file) => file.originalName.toLowerCase().includes(query) || file.tags?.some((tag) => tag.toLowerCase().includes(query)));
    res.json({ success: true, data: results });
  })
);

apiV1Router.post(
  "/api/v1/folders",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "write");
    const body = folderSchema.parse(req.body);
    const folder = await folderService.create(req.apiWorkspace!.id, req.apiWorkspace!.ownerId, body);
    res.status(201).json({ success: true, data: folder });
  })
);

apiV1Router.get(
  "/api/v1/folders",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    requireApiScope(req, "read");
    const folders = await folderService.list(req.apiWorkspace!.id, req.query.parentId as string | undefined);
    res.json({ success: true, data: folders });
  })
);
