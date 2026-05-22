import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { streamRateLimit } from "../../middlewares/rateLimit.js";
import { MediaController } from "./media.controller.js";

const controller = new MediaController();
export const mediaRouter = Router();

mediaRouter.post("/upload/image", requireAuth, upload.single("file"), asyncHandler(controller.uploadImage));
mediaRouter.post("/upload/video", requireAuth, upload.single("file"), asyncHandler(controller.uploadVideo));
mediaRouter.post("/upload/document", requireAuth, upload.single("file"), asyncHandler(controller.uploadDocument));
mediaRouter.post("/api/upload", requireAuth, upload.single("file"), asyncHandler(controller.uploadAny));
mediaRouter.get("/api/media", requireAuth, asyncHandler(controller.list));
mediaRouter.get("/api/media/:id", streamRateLimit, optionalAuth, asyncHandler(controller.stream));
mediaRouter.patch("/api/media/:id", requireAuth, asyncHandler(controller.update));
mediaRouter.patch("/api/media/:id/restore", requireAuth, asyncHandler(controller.restore));
mediaRouter.delete("/api/media/:id", requireAuth, asyncHandler(controller.delete));
mediaRouter.get("/media/:id", streamRateLimit, optionalAuth, asyncHandler(controller.stream));
mediaRouter.get("/media/:id/view", streamRateLimit, optionalAuth, asyncHandler(controller.view));
mediaRouter.get("/media/:id/download", streamRateLimit, optionalAuth, asyncHandler(controller.download));
mediaRouter.get("/media/:id/thumb", streamRateLimit, optionalAuth, asyncHandler(controller.thumbnail));
mediaRouter.get("/media/:id/thumbnail", streamRateLimit, optionalAuth, asyncHandler(controller.thumbnail));
mediaRouter.delete("/media/:id", requireAuth, asyncHandler(controller.delete));
mediaRouter.post("/media/bulk-delete", requireAuth, asyncHandler(controller.bulkDelete));
mediaRouter.post("/media/bulk-restore", requireAuth, asyncHandler(controller.bulkRestore));
