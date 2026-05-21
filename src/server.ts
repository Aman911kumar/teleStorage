import http from "node:http";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { closeRedisConnection } from "./config/redis.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Media service listening on ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(async () => {
      await closeRedisConnection();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  logger.error("Bootstrap failed", { error });
  process.exit(1);
});
