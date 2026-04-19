import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
export const authRouter = Router();
authRouter.get("/login", (_req, res) => {
    const params = new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        response_type: "code",
        redirect_uri: env.MICROSOFT_REDIRECT_URI,
        response_mode: "query",
        scope: "openid profile email offline_access User.Read Mail.Read Calendars.ReadWrite",
    });
    const authorizeUrl = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ authorizeUrl });
});
authRouter.get("/callback", async (req, res, next) => {
    try {
        const email = req.query.email ?? "demo.user@contoso.com";
        const tenantName = req.query.tenant ?? "Demo Organization";
        const role = req.query.role === "admin" ? "admin" : "user";
        const tenant = await prisma.tenant.upsert({
            where: { name: tenantName },
            update: {},
            create: { id: randomUUID(), name: tenantName }
        });
        const user = await prisma.user.upsert({
            where: { email_tenantId: { email, tenantId: tenant.id } },
            update: { role },
            create: {
                id: randomUUID(),
                tenantId: tenant.id,
                email,
                role,
                displayName: email.split("@")[0]
            }
        });
        const token = jwt.sign({
            userId: user.id,
            tenantId: tenant.id,
            email: user.email,
            role: user.role
        }, env.JWT_SECRET, { expiresIn: "8h" });
        res.json({ token, user });
    }
    catch (error) {
        next(error);
    }
});
authRouter.get("/logout", (_req, res) => {
    res.json({ loggedOut: true });
});
