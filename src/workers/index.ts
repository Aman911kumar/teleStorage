import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { getRedisConnection } from "../config/redis.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { processVideoTranscoding } from "./videoTranscoding.job.js";

async function bootstrapWorkers() {
  if (env.QUEUE_DRIVER === "memory") {
    logger.info("QUEUE_DRIVER=memory, external BullMQ workers are disabled");
    return;
  }

  await connectDatabase();
  const redis = getRedisConnection();

  const workers = [
    new Worker("image-processing", async (job) => logger.info("image processing placeholder", { jobId: job.id }), {
      connection: redis
    }),
    new Worker(
      "video-transcoding",
      async (job) => {
        await processVideoTranscoding(job.data as { mediaId: string; sourcePath: string });
      },
      { connection: redis }
    ),
    new Worker("thumbnail-generation", async (job) => logger.info("thumbnail placeholder", { jobId: job.id }), {
      connection: redis
    }),
    new Worker("cleanup", async (job) => logger.info("cleanup placeholder", { jobId: job.id }), { connection: redis }),
    new Worker("failed-retry-uploads", async (job) => logger.info("retry placeholder", { jobId: job.id }), {
      connection: redis
    })
  ];

  workers.forEach((worker) => worker.on("failed", (job, error) => logger.error("worker job failed", { jobId: job?.id, error })));
  logger.info("Workers started");
}

bootstrapWorkers().catch((error) => {
  logger.error("Worker bootstrap failed", { error });
  process.exit(1);
});
