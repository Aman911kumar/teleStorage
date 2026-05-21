import crypto from "node:crypto";
import { env } from "../config/env.js";

export function createSignedToken(mediaId: string, expiresInSeconds = env.SIGNED_URL_TTL_SECONDS) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${mediaId}.${expiresAt}`;
  const sig = crypto.createHmac("sha256", env.SIGNED_URL_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySignedToken(mediaId: string, token?: string) {
  if (!token) return false;
  const [tokenMediaId, expiresAtRaw, sig] = token.split(".");
  if (tokenMediaId !== mediaId || !expiresAtRaw || !sig) return false;
  if (Number(expiresAtRaw) < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto
    .createHmac("sha256", env.SIGNED_URL_SECRET)
    .update(`${tokenMediaId}.${expiresAtRaw}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
