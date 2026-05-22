import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { AppError, NotFoundError } from "../../core/errors.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";
import { ApiKeyModel } from "./api-key.model.js";

export type ApiScope = "upload" | "read" | "write" | "delete" | "admin" | "full";

function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function timingSafeCompare(value: string, hash: string) {
  const left = Buffer.from(hashSecret(value), "hex");
  const right = Buffer.from(hash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function generatePublicKey() {
  return `pk_${nanoid(28)}`;
}

function generateSecret() {
  return `sk_${nanoid(40)}`;
}

function mask(value: string) {
  return `${value.slice(0, 7)}...${value.slice(-4)}`;
}

export class ApiKeyService {
  async create(owner: string, input: { workspaceId: string; name: string; scopes?: ApiScope[] }) {
    const workspace = await WorkspaceModel.findOne({ _id: input.workspaceId, createdBy: owner, isActive: true }).lean();
    if (!workspace) throw new NotFoundError("Workspace not found");

    const secret = generateSecret();
    const publicKey = generatePublicKey();
    const apiKey = await ApiKeyModel.create({
      workspaceId: input.workspaceId,
      owner,
      name: input.name,
      publicKey,
      secretHash: hashSecret(secret),
      scopes: input.scopes?.length ? input.scopes : ["full"]
    });

    return { ...this.safe(apiKey.toObject()), secret };
  }

  async list(owner: string, workspaceId?: string) {
    const filter: Record<string, unknown> = { owner };
    if (workspaceId) filter.workspaceId = workspaceId;
    const keys = await ApiKeyModel.find(filter).sort({ createdAt: -1 }).lean();
    return keys.map((key) => this.safe(key));
  }

  async revoke(owner: string, id: string) {
    const key = await ApiKeyModel.findOneAndUpdate({ _id: id, owner }, { status: "revoked" }, { new: true }).lean();
    if (!key) throw new NotFoundError("API key not found");
    return this.safe(key);
  }

  async deletePermanently(owner: string, id: string) {
    const key = await ApiKeyModel.findOne({ _id: id, owner }).lean();
    if (!key) throw new NotFoundError("API key not found");
    if (key.status !== "revoked") {
      throw new AppError("Revoke this API key before deleting it permanently.", 409, "API_KEY_NOT_REVOKED");
    }

    await ApiKeyModel.deleteOne({ _id: id, owner });
  }

  async regenerate(owner: string, id: string) {
    const secret = generateSecret();
    const key = await ApiKeyModel.findOneAndUpdate(
      { _id: id, owner, status: "active" },
      { secretHash: hashSecret(secret) },
      { new: true }
    ).lean();
    if (!key) throw new NotFoundError("API key not found");
    return { ...this.safe(key), secret };
  }

  async authenticate(publicKey: string, secret: string, ip?: string) {
    const key = await ApiKeyModel.findOne({ publicKey, status: "active" }).lean();
    if (!key || !timingSafeCompare(secret, key.secretHash)) {
      throw new AppError("Invalid API key or secret.", 403, "INVALID_API_CREDENTIALS");
    }
    const workspace = await WorkspaceModel.findOne({ _id: key.workspaceId, isActive: true }).lean();
    if (!workspace) throw new AppError("Workspace is disabled.", 403, "WORKSPACE_DISABLED");
    await ApiKeyModel.updateOne({ _id: key._id }, { lastUsedAt: new Date(), lastUsedIp: ip }).catch(() => undefined);
    return { key, workspace };
  }

  async findPublicKey(publicKey: string, ip?: string) {
    const key = await ApiKeyModel.findOne({ publicKey, status: "active" }).lean();
    if (!key) throw new AppError("Invalid public API key", 403, "INVALID_PUBLIC_API_KEY");
    await ApiKeyModel.updateOne({ _id: key._id }, { lastUsedAt: new Date(), lastUsedIp: ip }).catch(() => undefined);
    return key;
  }

  private safe(key: any) {
    const rest = { ...key };
    delete rest.secretHash;
    return {
      ...rest,
      publicKeyMasked: mask(key.publicKey)
    };
  }
}
