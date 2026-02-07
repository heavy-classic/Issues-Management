import { Request, Response, NextFunction } from "express";

export function requestContext(req: Request, _res: Response, next: NextFunction) {
  req.requestIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown";
  req.requestUserAgent = req.headers["user-agent"] || "unknown";
  next();
}
