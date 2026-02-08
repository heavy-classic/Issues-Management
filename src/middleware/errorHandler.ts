import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File too large. Maximum size is 25MB." });
      return;
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      res
        .status(400)
        .json({ error: "Too many files. Maximum is 20 files per upload." });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message && err.message.startsWith("File type not allowed")) {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
