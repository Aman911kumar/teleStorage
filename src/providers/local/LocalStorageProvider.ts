import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "../../config/env.js";
import type { StorageProvider, StorageStream, UploadInput, UploadResult } from "../storage.types.js";

export class LocalStorageProvider implements StorageProvider {
  name = "local" as const;

  async uploadFile(input: UploadInput): Promise<UploadResult> {
    fs.mkdirSync(env.LOCAL_CACHE_DIR, { recursive: true });
    const target = path.join(env.LOCAL_CACHE_DIR, `${nanoid()}-${input.filename}`);
    await fs.promises.copyFile(input.path, target);
    return { provider: this.name, providerFileId: target };
  }

  async deleteFile(providerFileId: string): Promise<void> {
    await fs.promises.rm(providerFileId, { force: true });
  }

  async getFileUrl(providerFileId: string): Promise<string> {
    return providerFileId;
  }

  async streamFile(providerFileId: string): Promise<StorageStream> {
    const stat = await fs.promises.stat(providerFileId);
    return { stream: fs.createReadStream(providerFileId), contentLength: stat.size };
  }

  async generateSignedUrl(providerFileId: string): Promise<string> {
    return providerFileId;
  }
}
