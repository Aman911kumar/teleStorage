import fs from "node:fs";
import { Readable } from "node:stream";
import FormData from "form-data";
import { AppError } from "../../core/errors.js";
import { logger } from "../../utils/logger.js";
import type { StorageProvider, StorageStream, UploadInput, UploadResult } from "../storage.types.js";
import { telegramFetchStream, telegramMultipartRequest, telegramRequest } from "./telegramRequest.js";

type TelegramFilePayload = { file_id: string; file_size?: number };

type TelegramSendResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    photo?: TelegramFilePayload[];
    video?: TelegramFilePayload;
    document?: TelegramFilePayload;
    audio?: TelegramFilePayload;
    animation?: TelegramFilePayload;
    voice?: TelegramFilePayload;
    video_note?: TelegramFilePayload;
    sticker?: TelegramFilePayload;
  };
  description?: string;
};

type TelegramGetFileResponse = {
  ok: boolean;
  result?: { file_id: string; file_path: string; file_size?: number };
  description?: string;
};

type TelegramDeleteResponse = {
  ok: boolean;
  result?: boolean;
  description?: string;
};

export class TelegramStorageProvider implements StorageProvider {
  name = "telegram" as const;
  private apiBase: string;
  private channelId: string;
  private botToken: string;

  constructor(botToken?: string, channelId?: string) {
    if (!botToken || !channelId) {
      throw new AppError("Telegram workspace credentials are required.", 500, "TELEGRAM_CREDENTIALS_REQUIRED");
    }
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

    const file = this.extractTelegramFile(body.result, method);

    if (!file?.file_id) {
      logger.error("Telegram upload response did not include expected file_id", {
        method,
        responseKeys: Object.keys(body.result),
        messageId: body.result.message_id
      });
      throw new AppError("Telegram upload succeeded but file processing failed.", 502, "TELEGRAM_FILE_ID_MISSING");
    }

    return {
      provider: this.name,
      providerFileId: file.file_id,
      providerMessageId: String(body.result.message_id),
      size: file.file_size
    };
  }

  async deleteFile(_providerFileId: string, providerMessageId?: string): Promise<void> {
    if (!providerMessageId) {
      throw new AppError("Telegram message id is required for deletion.", 500, "TELEGRAM_MESSAGE_ID_REQUIRED");
    }

    const messageId = Number(providerMessageId);
    if (!Number.isInteger(messageId)) {
      throw new AppError("Telegram message id is invalid.", 500, "TELEGRAM_MESSAGE_ID_INVALID");
    }

    const body = await telegramRequest<TelegramDeleteResponse["result"]>(`${this.apiBase}/deleteMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: this.channelId,
        message_id: messageId
      })
    });

    if (!body.ok || body.result !== true) {
      throw new AppError(body.description ?? "Telegram delete failed.", 502, "TELEGRAM_DELETE_FAILED");
    }
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
    if (input.mimeType.startsWith("image/") && input.mimeType !== "image/gif") return "sendPhoto";
    if (input.mimeType.startsWith("video/")) return "sendVideo";
    if (input.mimeType.startsWith("audio/")) return "sendAudio";
    return "sendDocument";
  }

  private extractTelegramFile(result: NonNullable<TelegramSendResponse["result"]>, method: string) {
    if (method === "sendPhoto") return result.photo?.[result.photo.length - 1];
    if (method === "sendVideo") return result.video;
    if (method === "sendAudio") return result.audio;
    return (
      result.document ??
      result.animation ??
      result.voice ??
      result.video_note ??
      result.sticker ??
      result.photo?.[result.photo.length - 1] ??
      result.video ??
      result.audio
    );
  }

  private async getTelegramFile(providerFileId: string) {
    const body = await telegramRequest<TelegramGetFileResponse["result"]>(
      `${this.apiBase}/getFile?file_id=${encodeURIComponent(providerFileId)}`
    );
    if (!body.ok || !body.result?.file_path) {
      logger.error("Telegram getFile response missing file_path", {
        fileId: providerFileId,
        rawResponse: body
      });
      throw new AppError(body.description ?? "Telegram getFile failed", 502, "TELEGRAM_GET_FILE_FAILED");
    }
    return body.result;
  }
}
