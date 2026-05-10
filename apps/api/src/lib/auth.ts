import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "./env.js";

function getSecret(type: "access" | "refresh"): string {
  const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (env.NODE_ENV === "production") {
      throw new Error(`${type.toUpperCase()}_SECRET is required in production`);
    }
    return crypto.randomBytes(64).toString("hex");
  }
  return secret;
}

export function signAccessToken(payload: { userId: string }): string {
  return jwt.sign(payload, getSecret("access"), {
    expiresIn: env.JWT_ACCESS_EXPIRY_SECONDS,
  });
}

export function signRefreshToken(payload: { userId: string; sessionId: string }): string {
  return jwt.sign(payload, getSecret("refresh"), {
    expiresIn: env.JWT_REFRESH_EXPIRY_SECONDS,
  });
}

export function verifyAccessToken(token: string): { userId: string } {
  return jwt.verify(token, getSecret("access")) as { userId: string };
}

export function verifyRefreshToken(token: string): { userId: string; sessionId: string } {
  return jwt.verify(token, getSecret("refresh")) as { userId: string; sessionId: string };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}