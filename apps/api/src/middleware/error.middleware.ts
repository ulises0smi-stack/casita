import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/errors.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("[Error]", error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  res.status(500).json({
    error: "Internal server error"
  });
};
