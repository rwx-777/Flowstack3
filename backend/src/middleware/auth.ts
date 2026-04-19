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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
