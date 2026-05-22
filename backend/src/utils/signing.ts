import crypto from "node:crypto";
import { env } from "../config/env.js";

export function createSignedToken(mediaId: string, expiresInSeconds = env.SIGNED_URL_TTL_SECONDS, scope?: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const scopeHash = scope ? crypto.createHash("sha256").update(scope).digest("hex").slice(0, 16) : undefined;
  const payload = scopeHash ? `${mediaId}.${expiresAt}.${scopeHash}` : `${mediaId}.${expiresAt}`;
  const sig = crypto.createHmac("sha256", env.SIGNED_URL_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySignedToken(mediaId: string, token?: string, scope?: string) {
  if (!token) return false;
  const parts = token.split(".");
  const [tokenMediaId, expiresAtRaw] = parts;
  const hasScopedToken = parts.length === 4;
  const tokenScopeHash = hasScopedToken ? parts[2] : undefined;
  const sig = hasScopedToken ? parts[3] : parts[2];
  if (tokenMediaId !== mediaId || !expiresAtRaw || !sig) return false;
  if (Number(expiresAtRaw) < Math.floor(Date.now() / 1000)) return false;
  if (scope) {
    const expectedScopeHash = crypto.createHash("sha256").update(scope).digest("hex").slice(0, 16);
    if (tokenScopeHash !== expectedScopeHash) return false;
  }
  if (tokenScopeHash && !scope) return false;
  const payload = tokenScopeHash ? `${tokenMediaId}.${expiresAtRaw}.${tokenScopeHash}` : `${tokenMediaId}.${expiresAtRaw}`;
  const expected = crypto
    .createHmac("sha256", env.SIGNED_URL_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
