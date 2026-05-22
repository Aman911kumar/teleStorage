import type { CorsOptions } from "cors";
import { env } from "./env.js";
import { AppError } from "../core/errors.js";

const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

export const allowedOrigins = [
  ...new Set([
    env.APP_BASE_URL,
    ...localOrigins,
    ...env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ].filter(Boolean))
];

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(`CORS blocked origin: ${origin}`, 403, "CORS_ORIGIN_BLOCKED"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Content-Range", "ETag", "Accept-Ranges"],
  maxAge: 86400
};
