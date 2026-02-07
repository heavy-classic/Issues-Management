import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ms from "ms";
import crypto from "node:crypto";
import db from "../db";
import { config } from "../config";
import { AppError } from "../errors/AppError";

const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, config.jwt.accessSecret, {
    expiresIn: ms(config.jwt.accessExpiresIn as ms.StringValue) / 1000,
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: ms(config.jwt.refreshExpiresIn as ms.StringValue) / 1000,
  });
}

function parseRefreshExpiresMs(): number {
  const match = config.jwt.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000,
  };
  return value * (multipliers[unit] || 86400000);
}

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await db("users").where({ email }).first();
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db("users")
    .insert({ email, password_hash: passwordHash, name: name || null })
    .returning(["id", "email", "name", "created_at"]);

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await db("users").where({ email }).first();
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);

  await db("refresh_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + parseRefreshExpiresMs()),
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(rawRefreshToken: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(
      rawRefreshToken,
      config.jwt.refreshSecret
    ) as { userId: string };
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await db("refresh_tokens")
    .where({ token_hash: tokenHash })
    .first();
  if (!stored) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (new Date(stored.expires_at) < new Date()) {
    await db("refresh_tokens").where({ id: stored.id }).del();
    throw new AppError(401, "Refresh token has expired");
  }

  const user = await db("users").where({ id: payload.userId }).first();
  if (!user) {
    throw new AppError(401, "User not found");
  }

  const accessToken = signAccessToken(user.id, user.email);
  return { accessToken };
}

export async function logoutUser(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  const deleted = await db("refresh_tokens")
    .where({ token_hash: tokenHash })
    .del();
  if (deleted === 0) {
    throw new AppError(400, "Token not found or already revoked");
  }
}
