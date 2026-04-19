import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { enqueueEmailProcessing } from "../workers/queue.js";
export const emailRouter = Router();
emailRouter.use(requireAuth);
emailRouter.get("/", async (req, res, next) => {
    try {
        const emails = await prisma.email.findMany({
            where: { tenantId: req.auth.tenantId },
            orderBy: { createdAt: "desc" }
        });
        res.json(emails);
    }
    catch (error) {
        next(error);
    }
});
const syncSchema = z.object({
    emails: z.array(z.object({ subject: z.string(), body: z.string() }))
});
emailRouter.post("/sync", async (req, res, next) => {
    try {
        const parsed = syncSchema.parse(req.body);
        const created = [];
        for (const emailInput of parsed.emails) {
            const email = await prisma.email.create({
                data: {
                    id: randomUUID(),
                    tenantId: req.auth.tenantId,
                    userId: req.auth.userId,
                    subject: emailInput.subject,
                    body: emailInput.body,
                    status: "queued"
                }
            });
            created.push(email);
            await enqueueEmailProcessing(email.id);
        }
        res.status(201).json({ synced: created.length, emails: created });
    }
    catch (error) {
        next(error);
    }
});
emailRouter.post("/:id/reply", async (req, res, next) => {
    try {
        const email = await prisma.email.findFirst({
            where: { id: req.params.id, tenantId: req.auth.tenantId }
        });
        if (!email) {
            res.status(404).json({ error: "Email not found" });
            return;
        }
        res.json({ id: email.id, draftReply: email.aiResponse ?? "No AI response yet." });
    }
    catch (error) {
        next(error);
    }
});
