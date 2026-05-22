import crypto from "node:crypto";
import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";

function key() {
  return crypto.createHash("sha256").update(env.ENCRYPTION_SECRET).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

export function maskTelegramToken(token: string) {
  const [botId, secret] = token.split(":");
  if (!botId || !secret) return "********";
  return `${botId}:${secret.slice(0, 4)}${"*".repeat(Math.max(8, secret.length - 4))}`;
}
