import type { CorsOptions, CorsOptionsDelegate } from "cors";
import { env } from "./env.js";
import { AppError } from "../core/errors.js";

export const allowedOrigins = [
  ...new Set([
    env.FRONTEND_APP_URL,
    ...env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ].filter(Boolean))
];

function isPublicIntegrationPath(path = "") {
  return path.startsWith("/api/v1") || path.startsWith("/media/");
}

const baseOptions: Omit<CorsOptions, "origin"> = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Range",
    "X-Requested-With",
    "X-API-Key",
    "X-API-Secret",
    "X-Upload-Token",
    "X-Project-ID"
  ],
  exposedHeaders: ["Content-Length", "Content-Range", "ETag", "Accept-Ranges"],
  maxAge: 86400
};

export const corsOptions: CorsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  const path = "path" in req ? String(req.path) : "";

  if (!origin) return callback(null, { ...baseOptions, origin: true });

  if (isPublicIntegrationPath(path)) {
    return callback(null, { ...baseOptions, origin });
  }

  if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
    return callback(null, { ...baseOptions, origin });
  }

  return callback(new AppError(`CORS blocked origin: ${origin}`, 403, "CORS_ORIGIN_BLOCKED"));
};
