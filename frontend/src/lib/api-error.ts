import axios from "axios";

const messages: Record<string, string> = {
  TELEGRAM_VALIDATION_FAILED: "Unable to connect Telegram bot. Please verify the bot token and channel ID.",
  TELEGRAM_EMPTY_RESPONSE: "Telegram service temporarily unavailable.",
  TELEGRAM_INVALID_RESPONSE: "Telegram service temporarily unavailable.",
  TELEGRAM_SERVICE_UNAVAILABLE: "Telegram service temporarily unavailable.",
  TELEGRAM_HTTP_ERROR: "Telegram service temporarily unavailable.",
  TELEGRAM_STREAM_FAILED: "Telegram service temporarily unavailable.",
  TELEGRAM_RATE_LIMITED: "Telegram is rate limiting requests. Please try again shortly.",
  TELEGRAM_FILE_ID_MISSING: "Telegram upload succeeded but file processing failed.",
  TELEGRAM_BOT_NOT_ADMIN: "The bot must be an admin in the Telegram channel.",
  WORKSPACE_REQUIRED: "Select a Telegram workspace before uploading.",
  UPLOAD_CANCELED: "Upload canceled.",
  DUPLICATE_MEDIA: "This file already exists in your workspace.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  FORBIDDEN: "Your session expired. Please sign in again.",
  UNSUPPORTED_MEDIA_TYPE: "This file type is not supported.",
  FILE_REQUIRED: "Choose a file before uploading.",
  CORS_ORIGIN_BLOCKED: "This frontend URL is not allowed by the backend CORS settings."
};

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!axios.isAxiosError(error)) return fallback;
  if (error.code === "ECONNABORTED") return "The request took too long. Please try again.";
  if (!error.response) return "Server is unavailable. Check your connection and backend status.";
  const code = error.response.data?.error?.code;
  if (code && messages[code]) return messages[code];
  const status = error.response.status;
  if (status >= 500) return "Server error. Please try again in a moment.";
  if (status === 429) return "Too many requests. Please slow down and retry.";
  return fallback;
}
