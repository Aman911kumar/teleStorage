import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "UPLOAD_RATE_LIMITED",
      message: "Too many uploads. Please slow down and retry."
    }
  }
});

export const streamRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "STREAM_RATE_LIMITED",
      message: "Too many media requests. Please slow down and retry."
    }
  }
});
