import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signAccessToken, signRefreshToken, hashRefreshToken, verifyRefreshToken } from "../../lib/auth.js";
import { ConflictError, AuthError, NotFoundError, AppError } from "../../lib/errors.js";
import { env } from "../../lib/env.js";
import type { RegisterInput, LoginInput } from "@casita/shared";

function toUserDTO(user: { id: string; email: string; firstName: string | null; lastName: string | null; avatar: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
  };
}

function toSessionDTO(session: { id: string; deviceId: string | null; deviceName: string | null; ipAddress: string | null; userAgent: string | null; lastActivityAt: Date; expiresAt: Date; createdAt: Date }, currentSessionId?: string) {
  return {
    id: session.id,
    deviceId: session.deviceId,
    deviceName: session.deviceName,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    isCurrent: currentSessionId ? session.id === currentSessionId : undefined,
  };
}

async function cleanupOldSessions(userId: string, excludeSessionId?: string): Promise<void> {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActivityAt: "asc" },
  });

  const toRevoke = sessions.slice(0, Math.max(0, sessions.length - env.MAX_ACTIVE_SESSIONS + 1));
  for (const session of toRevoke) {
    if (!excludeSessionId || session.id !== excludeSessionId) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Email already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });

  return { user: toUserDTO(user), tokens: null };
}

export async function login(input: LoginInput, ipAddress?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AuthError("Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password");
  }

  const refreshToken = signRefreshToken({ userId: user.id, sessionId: "" });
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  await cleanupOldSessions(user.id, session.id);

  const accessToken = signAccessToken({ userId: user.id });
  const finalRefreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashRefreshToken(finalRefreshToken) },
  });

  return {
    user: toUserDTO(user),
    tokens: { accessToken, refreshToken: finalRefreshToken },
  };
}

export async function refresh(refreshToken: string) {
  let sessionId: string;
  let userId: string;
  try {
    const payload = verifyRefreshToken(refreshToken);
    sessionId = payload.sessionId;
    userId = payload.userId;
  } catch {
    throw new AuthError("Invalid or expired refresh token");
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, refreshTokenHash: tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!session) {
    throw new AuthError("Invalid or expired refresh token");
  }

  const accessToken = signAccessToken({ userId });
  const newRefreshToken = signRefreshToken({ userId, sessionId });
  const newTokenHash = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_SECONDS * 1000);

  await prisma.session.update({
    where: { id: sessionId },
    data: { refreshTokenHash: newTokenHash, lastActivityAt: new Date(), expiresAt },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return toUserDTO(user);
}

export async function getSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActivityAt: "desc" },
  });
  return sessions.map((s) => toSessionDTO(s, currentSessionId));
}

export async function revokeSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) {
    throw new NotFoundError("Session not found");
  }
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionIdFromToken(refreshToken: string): Promise<string | null> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    return payload.sessionId || null;
  } catch {
    return null;
  }
}