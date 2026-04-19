import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing bearer token" });
        return;
    }
    try {
        const token = authHeader.replace("Bearer ", "").trim();
        const payload = jwt.verify(token, env.JWT_SECRET);
        req.auth = payload;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
