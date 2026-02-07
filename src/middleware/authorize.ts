import { Request, Response, NextFunction } from "express";
import db from "../db";
import { AppError } from "../errors/AppError";

export function authorize(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }

    const user = await db("users")
      .select("id", "email", "name", "full_name", "role", "status")
      .where({ id: req.user.userId })
      .first();

    if (!user) {
      return next(new AppError(401, "User not found"));
    }

    if (user.status === "disabled") {
      return next(new AppError(403, "Account is disabled"));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }

    req.userRecord = user;
    next();
  };
}
