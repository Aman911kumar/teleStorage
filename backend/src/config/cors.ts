import type { CorsOptions } from "cors";
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

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(`CORS blocked origin: ${origin}`, 403, "CORS_ORIGIN_BLOCKED"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Content-Range", "ETag", "Accept-Ranges"],
  maxAge: 86400
};
