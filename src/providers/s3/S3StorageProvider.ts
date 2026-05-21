import { AppError } from "../../core/errors.js";
import type { StorageProvider, StorageStream, UploadInput, UploadResult } from "../storage.types.js";

export class S3StorageProvider implements StorageProvider {
  name = "s3" as const;

  async uploadFile(_input: UploadInput): Promise<UploadResult> {
    throw new AppError("S3 provider is configured as placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async deleteFile(): Promise<void> {
    throw new AppError("S3 provider is configured as placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async getFileUrl(): Promise<string> {
    throw new AppError("S3 provider is configured as placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async streamFile(): Promise<StorageStream> {
    throw new AppError("S3 provider is configured as placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async generateSignedUrl(): Promise<string> {
    throw new AppError("S3 provider is configured as placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }
}
