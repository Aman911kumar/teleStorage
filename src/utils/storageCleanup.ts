import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { isTempFileActive } from "./activeTempFiles.js";

type FileEntry = {
  path: string;
  size: number;
  mtimeMs: number;
};

async function walkFiles(root: string): Promise<FileEntry[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) return walkFiles(fullPath);
        if (!entry.isFile()) return [];
        const stat = await fs.stat(fullPath);
        return [{ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs }];
      })
    );
    return files.flat();
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
}

async function removeEmptyDirs(root: string) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => removeEmptyDirs(path.join(root, entry.name))));
    const remaining = await fs.readdir(root);
    if (remaining.length === 0) await fs.rmdir(root).catch(() => undefined);
  } catch {
    // Best effort cleanup only.
  }
}

export async function cleanupStorage() {
  const now = Date.now();
  const tempMaxAgeMs = Math.max(env.TEMP_FILE_TTL_SECONDS * 1000, 5 * 60 * 1000);
  const cacheMaxAgeMs = env.CACHE_TTL_SECONDS * 1000;
  const cacheMaxBytes = env.CACHE_MAX_MB * 1024 * 1024;

  const [tempFiles, cacheFiles] = await Promise.all([walkFiles(env.UPLOAD_TMP_DIR), walkFiles(env.LOCAL_CACHE_DIR)]);

  let removedTemp = 0;
  let removedCache = 0;
  let freedBytes = 0;

  for (const file of tempFiles) {
    if (isTempFileActive(file.path)) continue;
    if (now - file.mtimeMs < tempMaxAgeMs) continue;
    await fs.rm(file.path, { force: true });
    removedTemp += 1;
    freedBytes += file.size;
  }

  for (const file of cacheFiles) {
    if (now - file.mtimeMs < cacheMaxAgeMs) continue;
    await fs.rm(file.path, { force: true });
    removedCache += 1;
    freedBytes += file.size;
  }

  const remainingCache = (await walkFiles(env.LOCAL_CACHE_DIR)).sort((a, b) => a.mtimeMs - b.mtimeMs);
  let cacheBytes = remainingCache.reduce((sum, file) => sum + file.size, 0);
  for (const file of remainingCache) {
    if (cacheBytes <= cacheMaxBytes) break;
    await fs.rm(file.path, { force: true });
    cacheBytes -= file.size;
    removedCache += 1;
    freedBytes += file.size;
  }

  await Promise.all([removeEmptyDirs(env.UPLOAD_TMP_DIR), removeEmptyDirs(env.LOCAL_CACHE_DIR)]);

  if (removedTemp || removedCache || freedBytes) {
    logger.info("Storage cleanup completed", {
      removedTemp,
      removedCache,
      freedBytes,
      cacheBytes
    });
  }
}

export function startStorageCleanup() {
  const intervalMs = env.CLEANUP_INTERVAL_SECONDS * 1000;
  const timer = setInterval(() => {
    cleanupStorage().catch((error) =>
      logger.error("Storage cleanup failed", { error: error instanceof Error ? error.message : String(error) })
    );
  }, intervalMs);
  timer.unref();

  cleanupStorage().catch((error) =>
    logger.error("Initial storage cleanup failed", { error: error instanceof Error ? error.message : String(error) })
  );

  return () => clearInterval(timer);
}
