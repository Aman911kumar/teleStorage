import { AppError } from "../../core/errors.js";
import type { StorageProvider, StorageStream, UploadInput, UploadResult } from "../storage.types.js";

export class CloudinaryStorageProvider implements StorageProvider {
  name = "cloudinary" as const;

  async uploadFile(_input: UploadInput): Promise<UploadResult> {
    throw new AppError("Cloudinary provider is placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async deleteFile(): Promise<void> {
    throw new AppError("Cloudinary provider is placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async getFileUrl(): Promise<string> {
    throw new AppError("Cloudinary provider is placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async streamFile(): Promise<StorageStream> {
    throw new AppError("Cloudinary provider is placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }

  async generateSignedUrl(): Promise<string> {
    throw new AppError("Cloudinary provider is placeholder-ready", 501, "PROVIDER_NOT_IMPLEMENTED");
  }
}
