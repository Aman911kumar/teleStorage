import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { apiCors, dashboardCors, mediaCors } from "./config/cors.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { apiKeyRouter } from "./modules/api-keys/api-key.routes.js";
import { apiV1Router } from "./modules/api-v1/api-v1.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { folderRouter } from "./modules/folders/folder.routes.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { workspaceRouter } from "./modules/workspaces/workspace.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { apiRateLimit } from "./middlewares/rateLimit.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use("/api/v1", cors(apiCors));
  app.use("/media", cors(mediaCors));
  app.use("/preview", cors(mediaCors));
  app.use("/stream", cors(mediaCors));
  app.use(
    [
      "/api/auth",
      "/auth",
      "/api/api-keys",
      "/api/api-request-logs",
      "/api/workspaces",
      "/api/folders",
      "/api/media",
      "/api/upload",
      "/api/analytics",
      "/api/users",
      "/admin",
      "/upload"
    ],
    cors(dashboardCors)
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(apiRateLimit);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use(authRouter);
  app.use(apiKeyRouter);
  app.use(apiV1Router);
  app.use(workspaceRouter);
  app.use(folderRouter);
  app.use(analyticsRouter);
  app.use(mediaRouter);
  app.use(adminRouter);
  app.use(userRouter);

  app.use(errorHandler);
  return app;
}
