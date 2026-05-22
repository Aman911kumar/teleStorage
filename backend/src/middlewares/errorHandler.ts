import type { ErrorRequestHandler } from "express";
import { AppError } from "../core/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const normalizedError =
    (error as NodeJS.ErrnoException).code === "ENOENT"
      ? new AppError("Upload temp file was not available. Please retry the upload.", 400, "UPLOAD_TEMP_FILE_MISSING")
      : error;
  const statusCode = normalizedError instanceof AppError ? normalizedError.statusCode : 500;
  const code = normalizedError instanceof AppError ? normalizedError.code : "INTERNAL_ERROR";

  logger.error(normalizedError.message, { stack: normalizedError.stack, code });
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode === 500 ? "Internal server error" : normalizedError.message
    }
  });
};
