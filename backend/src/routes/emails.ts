import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import { enqueueEmailProcessing } from "../workers/queue.js";
import {
  getValidAccessToken,
  fetchOutlookEmails,
  replyToOutlookMessage,
} from "../services/graph.js";

export const emailRouter = Router();
emailRouter.use(apiRateLimit);
emailRouter.use(requireAuth);

emailRouter.get("/", async (req, res, next) => {
  try {
    const emails = await prisma.email.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" }
    });
    res.json(emails);
  } catch (error) {
    next(error);
  }
});

const syncSchema = z.object({
  emails: z.array(z.object({ subject: z.string(), body: z.string() }))
});

/**
 * POST /emails/sync
 *
 * Two modes:
 *  1. If the user has linked a Microsoft account (Graph tokens stored),
 *     fetch the latest messages from Outlook via Microsoft Graph, deduplicate
 *     by messageId, and enqueue them for AI processing.
 *  2. Otherwise fall back to the original behaviour: accept a JSON array of
 *     emails in the request body.
 */
emailRouter.post("/sync", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { msGraphAccessToken: true },
    });

    // ── Graph-based sync ────────────────────────────────────────────────
    if (user?.msGraphAccessToken) {
      const accessToken = await getValidAccessToken(req.auth!.userId);
      const messages = await fetchOutlookEmails(accessToken);

      const created = [];
      for (const msg of messages) {
        // Skip messages we already ingested (deduplicate by Graph message id)
        const existing = await prisma.email.findUnique({
          where: { messageId: msg.id },
        });
        if (existing) continue;

        const email = await prisma.email.create({
          data: {
            id: randomUUID(),
            tenantId: req.auth!.tenantId,
            userId: req.auth!.userId,
            messageId: msg.id,
            subject: msg.subject ?? "(no subject)",
            body: msg.body?.content ?? msg.bodyPreview ?? "",
            status: "queued",
          },
        });
        created.push(email);
        await enqueueEmailProcessing(email.id);
      }

      res.status(201).json({ source: "outlook", synced: created.length, emails: created });
      return;
    }

    // ── Manual / fallback sync ──────────────────────────────────────────
    const parsed = syncSchema.parse(req.body);
    const created = [];

    for (const emailInput of parsed.emails) {
      const email = await prisma.email.create({
        data: {
          id: randomUUID(),
          tenantId: req.auth!.tenantId,
          userId: req.auth!.userId,
          subject: emailInput.subject,
          body: emailInput.body,
          status: "queued"
        }
      });
      created.push(email);
      await enqueueEmailProcessing(email.id);
    }

    res.status(201).json({ source: "manual", synced: created.length, emails: created });
  } catch (error) {
    next(error);
  }
});

const replySchema = z.object({
  send: z.boolean().optional().default(false),
});

/**
 * POST /emails/:id/reply
 *
 * Returns the AI-generated draft reply.
 * If `{ "send": true }` is provided in the body AND the original email has a
 * Graph messageId, the reply is also sent via Microsoft Graph.
 */
emailRouter.post("/:id/reply", async (req, res, next) => {
  try {
    const emailId = String(req.params.id);
    const email = await prisma.email.findFirst({
      where: { id: emailId, tenantId: req.auth!.tenantId }
    });

    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    const draftReply = email.aiResponse ?? "No AI response yet.";

    const { send } = replySchema.parse(req.body ?? {});

    if (send) {
      if (!email.messageId) {
        res.status(400).json({
          error: "Cannot send reply: email was not synced from Outlook (no Graph messageId).",
        });
        return;
      }

      const accessToken = await getValidAccessToken(req.auth!.userId);
      await replyToOutlookMessage(accessToken, email.messageId, draftReply);

      res.json({ id: email.id, draftReply, sent: true });
      return;
    }

    res.json({ id: email.id, draftReply, sent: false });
  } catch (error) {
    next(error);
  }
});
