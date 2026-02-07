import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../errors/AppError";

interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or malformed Authorization header"));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(
      token,
      config.jwt.accessSecret
    ) as AccessTokenPayload;
    req.user = { userId: payload.userId, email: payload.email, role: payload.role || "user" };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
}
