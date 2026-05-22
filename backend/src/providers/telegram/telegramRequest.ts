import { AppError } from "../../core/errors.js";
import { logger } from "../../utils/logger.js";
import https from "node:https";
import type FormData from "form-data";

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

type TelegramRequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

export function sanitizeUrl(url: string) {
  return url.replace(/bot[^/]+/g, "bot<redacted>");
}

function preview(text: string) {
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function parseTelegramText<T>(text: string, status: number, url: string, attempt: number): TelegramEnvelope<T> {
  if (!text) {
    logger.error("Telegram returned empty response", {
      url: sanitizeUrl(url),
      status,
      attempt
    });
    throw new AppError("Telegram returned an invalid or empty response.", 502, "TELEGRAM_EMPTY_RESPONSE");
  }

  try {
    return JSON.parse(text) as TelegramEnvelope<T>;
  } catch {
    logger.error("Invalid JSON response from Telegram", {
      url: sanitizeUrl(url),
      status,
      text: preview(text),
      attempt
    });
    throw new AppError("Telegram returned an invalid or empty response.", 502, "TELEGRAM_INVALID_RESPONSE");
  }
}

function assertTelegramOk<T>(body: TelegramEnvelope<T>, status: number, url: string, attempt: number) {
  if (status === 429 || body.error_code === 429) {
    logger.warn("Telegram rate limit response", {
      url: sanitizeUrl(url),
      status,
      retryAfter: body.parameters?.retry_after
    });
    throw new AppError("Telegram is rate limiting requests. Please try again shortly.", 429, "TELEGRAM_RATE_LIMITED");
  }

  if (status < 200 || status >= 300) {
    if (status === 400 && /message to delete not found/i.test(body.description ?? "")) {
      throw new AppError(body.description ?? "Telegram message not found.", 404, "TELEGRAM_MESSAGE_NOT_FOUND");
    }
    logger.error("Telegram HTTP error", {
      url: sanitizeUrl(url),
      status,
      description: body.description,
      attempt
    });
    throw new AppError(body.description ?? "Telegram service temporarily unavailable.", 502, "TELEGRAM_HTTP_ERROR");
  }
}

function isRetryable(error: unknown) {
  return error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError");
}

export async function telegramRequest<T>(url: string, options: TelegramRequestOptions = {}): Promise<TelegramEnvelope<T>> {
  const { timeoutMs = 10_000, retries = 1, headers, ...init } = options;
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal
      });

      const text = await response.text();
      const body = parseTelegramText<T>(text, response.status, url, attempt);
      assertTelegramOk(body, response.status, url, attempt);

      return body;
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      if (timedOut) {
        logger.error("Telegram request timed out", {
          url: sanitizeUrl(url),
          timeoutMs,
          attempt
        });
      }

      if (error instanceof AppError) throw error;

      if (attempt < retries && isRetryable(error)) {
        logger.warn("Retrying Telegram request after network failure", {
          url: sanitizeUrl(url),
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
        attempt += 1;
        continue;
      }

      logger.error("Telegram network request failed", {
        url: sanitizeUrl(url),
        attempt,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
}

export async function telegramMultipartRequest<T>(
  url: string,
  createForm: () => FormData,
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<TelegramEnvelope<T>> {
  const { timeoutMs = 30_000, retries = 1 } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const form = createForm();
      const text = await new Promise<{ text: string; status: number }>((resolve, reject) => {
        const parsed = new URL(url);
        const headers = form.getHeaders();

        form.getLength((lengthError, length) => {
          if (!lengthError) headers["content-length"] = String(length);

          const request = https.request(
            {
              method: "POST",
              hostname: parsed.hostname,
              path: `${parsed.pathname}${parsed.search}`,
              headers,
              timeout: timeoutMs
            },
            (response) => {
              const chunks: Buffer[] = [];
              response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
              response.on("end", () => {
                resolve({
                  text: Buffer.concat(chunks).toString("utf8"),
                  status: response.statusCode ?? 0
                });
              });
            }
          );

          request.on("timeout", () => {
            request.destroy(new Error("Telegram multipart request timed out"));
          });
          request.on("error", reject);
          form.on("error", reject);
          form.pipe(request);
        });
      });

      const body = parseTelegramText<T>(text.text, text.status, url, attempt);
      assertTelegramOk(body, text.status, url, attempt);
      return body;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (attempt < retries) {
        logger.warn("Retrying Telegram multipart request after network failure", {
          url: sanitizeUrl(url),
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
        attempt += 1;
        continue;
      }
      logger.error("Telegram multipart request failed", {
        url: sanitizeUrl(url),
        attempt,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
    }
  }

  throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
}

export async function telegramFetchStream(url: string, options: TelegramRequestOptions = {}) {
  const { timeoutMs = 10_000, retries = 1, headers, ...init } = options;
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, headers, signal: controller.signal });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        logger.error("Telegram stream request failed", {
          url: sanitizeUrl(url),
          status: response.status,
          text: preview(text),
          attempt
        });
        throw new AppError("Unable to fetch file from Telegram.", 502, "TELEGRAM_STREAM_FAILED");
      }
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (attempt < retries && isRetryable(error)) {
        attempt += 1;
        continue;
      }
      logger.error("Telegram stream network failure", {
        url: sanitizeUrl(url),
        attempt,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AppError("Telegram service temporarily unavailable.", 502, "TELEGRAM_SERVICE_UNAVAILABLE");
}
