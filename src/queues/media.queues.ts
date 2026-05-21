import { Queue } from "bullmq";
import { env } from "../config/env.js";
import { getRedisConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { processVideoTranscoding } from "../workers/videoTranscoding.job.js";

const connection = env.QUEUE_DRIVER === "bullmq" ? getRedisConnection() : undefined;

export const imageProcessingQueue = connection ? new Queue("image-processing", { connection }) : undefined;
export const videoTranscodingQueue = connection ? new Queue("video-transcoding", { connection }) : undefined;
export const thumbnailQueue = connection ? new Queue("thumbnail-generation", { connection }) : undefined;
export const cleanupQueue = connection ? new Queue("cleanup", { connection }) : undefined;
export const failedRetryQueue = connection ? new Queue("failed-retry-uploads", { connection }) : undefined;

export async function enqueueImageProcessing(data: unknown) {
  if (!imageProcessingQueue) {
    logger.debug("memory queue: image processing placeholder", { data });
    return;
  }
  await imageProcessingQueue.add("process-image", data, { attempts: 3 });
}

export async function enqueueVideoTranscoding(data: unknown) {
  if (!videoTranscodingQueue) {
    setImmediate(() => {
      processVideoTranscoding(data as { mediaId: string; sourcePath: string }).catch((error) =>
        logger.error("memory video transcoding failed", { error })
      );
    });
    return;
  }
  await videoTranscodingQueue.add("transcode-video", data, { attempts: 3 });
}

export async function enqueueThumbnail(data: unknown) {
  if (!thumbnailQueue) {
    logger.debug("memory queue: thumbnail job is handled by video transcoding", { data });
    return;
  }
  await thumbnailQueue.add("generate-thumbnail", data, { attempts: 3 });
}
