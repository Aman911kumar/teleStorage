import type { Readable } from "node:stream";

export type StorageProviderName = "telegram" | "s3" | "cloudinary" | "local";

export interface UploadInput {
  path: string;
  filename: string;
  mimeType: string;
  kind: "image" | "video" | "audio" | "document" | "thumbnail";
}

export interface UploadResult {
  provider: StorageProviderName;
  providerFileId: string;
  providerMessageId?: string;
  size?: number;
}

export interface StorageStream {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
  contentRange?: string;
  statusCode?: number;
}

export interface StorageProvider {
  name: StorageProviderName;
  uploadFile(input: UploadInput): Promise<UploadResult>;
  deleteFile(providerFileId: string, providerMessageId?: string): Promise<void>;
  getFileUrl(providerFileId: string): Promise<string>;
  streamFile(providerFileId: string, range?: string): Promise<StorageStream>;
  generateSignedUrl(providerFileId: string, expiresInSeconds?: number): Promise<string>;
}
