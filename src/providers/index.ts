import { env } from "../config/env.js";
import type { StorageProvider } from "./storage.types.js";
import { CloudinaryStorageProvider } from "./cloudinary/CloudinaryStorageProvider.js";
import { LocalStorageProvider } from "./local/LocalStorageProvider.js";
import { S3StorageProvider } from "./s3/S3StorageProvider.js";
import { TelegramStorageProvider } from "./telegram/TelegramStorageProvider.js";

export function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "telegram":
      return new TelegramStorageProvider();
    case "s3":
      return new S3StorageProvider();
    case "cloudinary":
      return new CloudinaryStorageProvider();
    case "local":
      return new LocalStorageProvider();
  }
}
