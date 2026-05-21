import type { ErrorRequestHandler } from "express";
import { AppError } from "../core/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

  logger.error(error.message, { stack: error.stack, code });
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode === 500 ? "Internal server error" : error.message
    }
  });
};
