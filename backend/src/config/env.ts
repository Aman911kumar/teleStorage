import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url().optional(),
  FRONTEND_APP_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().default(""),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().optional(),
  QUEUE_DRIVER: z.enum(["bullmq", "memory"]).default("memory"),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHANNEL_ID: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["telegram", "s3", "cloudinary", "local"]).default("telegram"),
  MAX_UPLOAD_MB: z.coerce.number().default(2048),
  DEFAULT_WORKSPACE_STORAGE_LIMIT_GB: z.coerce.number().default(0),
  LOCAL_CACHE_DIR: z.string().default("tmp/cache"),
  UPLOAD_TMP_DIR: z.string().default("tmp/uploads"),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  CACHE_MAX_MB: z.coerce.number().default(512),
  TEMP_FILE_TTL_SECONDS: z.coerce.number().default(3600),
  CLEANUP_INTERVAL_SECONDS: z.coerce.number().default(900),
  SIGNED_URL_SECRET: z
    .string()
    .min(16, "SIGNED_URL_SECRET must be at least 16 characters. Use a long random secret."),
  ENCRYPTION_SECRET: z
    .string()
    .min(32, "ENCRYPTION_SECRET must be at least 32 characters. Use a long random secret."),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().default(900),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120)
});

export const env = envSchema.parse(process.env);
