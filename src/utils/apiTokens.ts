import crypto from "node:crypto";
import { nanoid } from "nanoid";

export function generateUploadToken() {
  return `tst_${nanoid(32)}`;
}

export function generatePublicProjectId() {
  return `prj_${nanoid(14)}`;
}

export function hashUploadToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyUploadToken(token: string, hash?: string) {
  if (!token || !hash) return false;
  const provided = Buffer.from(hashUploadToken(token), "hex");
  const expected = Buffer.from(hash, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
