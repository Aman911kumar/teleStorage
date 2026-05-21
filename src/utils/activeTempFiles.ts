import path from "node:path";

const activeTempFiles = new Map<string, number>();
const maxActiveAgeMs = 30 * 60 * 1000;

export function trackTempFile(filePath: string) {
  activeTempFiles.set(path.resolve(filePath), Date.now());
}

export function untrackTempFile(filePath: string) {
  activeTempFiles.delete(path.resolve(filePath));
}

export function isTempFileActive(filePath: string) {
  const resolved = path.resolve(filePath);
  const trackedAt = activeTempFiles.get(resolved);
  if (!trackedAt) return false;
  if (Date.now() - trackedAt <= maxActiveAgeMs) return true;
  activeTempFiles.delete(resolved);
  return false;
}
