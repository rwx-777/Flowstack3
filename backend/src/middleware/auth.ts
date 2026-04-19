import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedUser } from "../types/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

/**
 * Normalise a decoded JWT payload into the AuthenticatedUser shape.
 *
 * Tokens may originate from:
 *   • The backend `/auth/callback` (has `userId`, `tenantId`, `email`, `role`).
 *   • A NextAuth session JWT forwarded by the frontend (has `userId` as a
 *     custom claim, `email`, `role`; `tenantId` may be absent).
 *
 * The function gracefully handles both by falling back to `sub` for `userId`
 * and to `"default"` for `tenantId`.
 */
function normalisePayload(payload: Record<string, unknown>): AuthenticatedUser | null {
  const userId = String(payload.userId ?? payload.sub ?? "");
  const email = String(payload.email ?? "");

  if (!userId || !email) return null;

  return {
    userId,
    tenantId: String(payload.tenantId ?? "default"),
    email,
    role: payload.role === "admin" ? "admin" : "user",
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;
    const user = normalisePayload(payload);
    if (!user) {
      res.status(401).json({ error: "Token missing required claims" });
      return;
    }
    req.auth = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
