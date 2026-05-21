import IORedis from "ioredis";
import { env } from "./env.js";
import { AppError } from "../core/errors.js";

let redis: IORedis | undefined;

export function getRedisConnection() {
  if (redis) return redis;
  if (!env.REDIS_URL) {
    throw new AppError("REDIS_URL is required when QUEUE_DRIVER=bullmq", 500, "REDIS_URL_REQUIRED");
  }
  redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
  return redis;
}

export async function closeRedisConnection() {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}
