import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const allowedOrigins = [
  ...new Set([
    env.FRONTEND_APP_URL,
    ...env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ].filter(Boolean))
];

function isLocalDevOrigin(origin: string) {
  if (env.NODE_ENV === "production") return false;

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

const sharedOptions: Omit<CorsOptions, "origin" | "credentials"> = {
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

export const dashboardCors: CorsOptions = {
  ...sharedOptions,
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, origin);
    }
    return callback(null, false);
  }
};

export const apiCors: CorsOptions = {
  ...sharedOptions,
  credentials: false,
  origin: true
};

export const mediaCors: CorsOptions = {
  ...sharedOptions,
  credentials: false,
  origin: "*"
};
