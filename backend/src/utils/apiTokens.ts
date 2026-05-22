import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

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

type TemporaryUploadTokenPayload = {
  workspaceId: string;
  ownerId: string;
  publicProjectId: string;
  scopes: string[];
  exp: number;
};

function sign(value: string) {
  return crypto.createHmac("sha256", env.SIGNED_URL_SECRET).update(value).digest("base64url");
}

export function createTemporaryUploadToken(input: Omit<TemporaryUploadTokenPayload, "exp"> & { ttlSeconds?: number }) {
  const payload: TemporaryUploadTokenPayload = {
    workspaceId: input.workspaceId,
    ownerId: input.ownerId,
    publicProjectId: input.publicProjectId,
    scopes: input.scopes,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 900)
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `ut_${encoded}.${sign(encoded)}`;
}

export function verifyTemporaryUploadToken(token?: string) {
  if (!token?.startsWith("ut_")) return undefined;
  const raw = token.slice(3);
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return undefined;
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TemporaryUploadTokenPayload;
    if (!payload.workspaceId || !payload.ownerId || !payload.publicProjectId || payload.exp < Math.floor(Date.now() / 1000)) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}
