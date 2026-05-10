import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from "@casita/shared";

export async function register(req: Request<{}, {}, RegisterInput>, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request<{}, {}, LoginInput>, res: Response) {
  const result = await authService.login(
    req.body,
    req.ip ?? undefined,
    req.get("user-agent") ?? undefined
  );
  res.json(result);
}

export async function refresh(req: Request<{}, {}, RefreshInput>, res: Response) {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
}

export async function logout(req: Request<{}, {}, LogoutInput>, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const sessionId = await authService.getSessionIdFromToken(req.body.refreshToken);
    if (sessionId) {
      const payload = require("../../lib/auth.js").verifyAccessToken(token);
      await authService.logout(payload.userId, sessionId);
    }
  }
  res.json({ success: true });
}

export async function logoutAll(_req: Request, res: Response) {
  const { requireAuth } = await import("../../middleware/auth.middleware.js");
  const authReq = _req as import("../../middleware/auth.middleware.js").AuthenticatedRequest;
  if (authReq.userId) {
    await authService.logoutAll(authReq.userId);
  }
  res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  const authReq = req as import("../../middleware/auth.middleware.js").AuthenticatedRequest;
  const user = await authService.getMe(authReq.userId!);
  res.json(user);
}

export async function getSessions(req: Request, res: Response) {
  const authReq = req as import("../../middleware/auth.middleware.js").AuthenticatedRequest;
  const sessions = await authService.getSessions(authReq.userId!);
  res.json(sessions);
}

export async function revokeSession(req: Request, res: Response) {
  const authReq = req as import("../../middleware/auth.middleware.js").AuthenticatedRequest;
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }
  await authService.revokeSession(authReq.userId!, sessionId);
  res.json({ success: true });
}