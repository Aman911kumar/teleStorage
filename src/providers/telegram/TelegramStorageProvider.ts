import fs from "node:fs";
import { Readable } from "node:stream";
import FormData from "form-data";
import { env } from "../../config/env.js";
import { AppError } from "../../core/errors.js";
import type { StorageProvider, StorageStream, UploadInput, UploadResult } from "../storage.types.js";
import { telegramFetchStream, telegramMultipartRequest, telegramRequest } from "./telegramRequest.js";

type TelegramSendResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    photo?: Array<{ file_id: string; file_size?: number }>;
    video?: { file_id: string; file_size?: number };
    document?: { file_id: string; file_size?: number };
    audio?: { file_id: string; file_size?: number };
  };
  description?: string;
};

type TelegramGetFileResponse = {
  ok: boolean;
  result?: { file_id: string; file_path: string; file_size?: number };
  description?: string;
};

export class TelegramStorageProvider implements StorageProvider {
  name = "telegram" as const;
  private apiBase: string;
  private channelId: string;
  private botToken: string;

  constructor(botToken = env.TELEGRAM_BOT_TOKEN, channelId = env.TELEGRAM_CHANNEL_ID) {
    this.botToken = botToken;
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    this.channelId = channelId;
  }

  async uploadFile(input: UploadInput): Promise<UploadResult> {
    const method = this.resolveMethod(input);
    const field =
      method === "sendPhoto" ? "photo" : method === "sendVideo" ? "video" : method === "sendAudio" ? "audio" : "document";
    const body = await telegramMultipartRequest<TelegramSendResponse["result"]>(`${this.apiBase}/${method}`, () => {
      const form = new FormData();
      form.append("chat_id", this.channelId);
      form.append(field, fs.createReadStream(input.path), {
        filename: input.filename,
        contentType: input.mimeType
      });
      return form;
    });
    if (!body.ok || !body.result) {
      throw new AppError(body.description ?? "Telegram upload failed", 502, "TELEGRAM_UPLOAD_FAILED");
    }

    const file =
      body.result.video ??
      body.result.audio ??
      body.result.document ??
      body.result.photo?.[body.result.photo.length - 1];

    if (!file?.file_id) {
      throw new AppError("Telegram upload succeeded but file processing failed.", 502, "TELEGRAM_FILE_ID_MISSING");
    }

    return {
      provider: this.name,
      providerFileId: file.file_id,
      providerMessageId: String(body.result.message_id),
      size: file.file_size
    };
  }

  async deleteFile(_providerFileId: string, _providerMessageId?: string): Promise<void> {
    // Telegram bots cannot delete by file_id. If providerMessageId is present, deleteMessage can be added safely.
  }

  async getFileUrl(providerFileId: string): Promise<string> {
    const file = await this.getTelegramFile(providerFileId);
    return `https://api.telegram.org/file/bot${this.botToken}/${file.file_path}`;
  }

  async streamFile(providerFileId: string, range?: string): Promise<StorageStream> {
    const fileUrl = await this.getFileUrl(providerFileId);
    const response = await telegramFetchStream(fileUrl, {
      headers: range ? { Range: range } : undefined
    });
    return {
      stream: Readable.fromWeb(response.body as any),
      contentLength: Number(response.headers.get("content-length")) || undefined,
      contentType: response.headers.get("content-type") ?? undefined,
      contentRange: response.headers.get("content-range") ?? undefined,
      statusCode: response.status
    };
  }

  async generateSignedUrl(providerFileId: string): Promise<string> {
    return this.getFileUrl(providerFileId);
  }

  private resolveMethod(input: UploadInput) {
    if (input.kind === "image" && input.mimeType !== "image/gif") return "sendPhoto";
    if (input.kind === "video") return "sendVideo";
    if (input.kind === "audio") return "sendAudio";
    return "sendDocument";
  }

  private async getTelegramFile(providerFileId: string) {
    const body = await telegramRequest<TelegramGetFileResponse["result"]>(
      `${this.apiBase}/getFile?file_id=${encodeURIComponent(providerFileId)}`
    );
    if (!body.ok || !body.result?.file_path) {
      throw new AppError(body.description ?? "Telegram getFile failed", 502, "TELEGRAM_GET_FILE_FAILED");
    }
    return body.result;
  }
}
