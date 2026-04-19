import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import {
  getValidAccessToken,
  fetchOutlookCalendarEvents,
} from "../services/graph.js";

export const calendarRouter = Router();
calendarRouter.use(apiRateLimit);
calendarRouter.use(requireAuth);

const eventSchema = z.object({
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendees: z.array(z.string().email()).optional()
});

calendarRouter.get("/events", async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { attendees: true, reminders: true }
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

calendarRouter.post("/events", async (req, res, next) => {
  try {
    const payload = eventSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        id: randomUUID(),
        tenantId: req.auth!.tenantId,
        title: payload.title,
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        createdByUserId: req.auth!.userId,
        attendees: {
          create: (payload.attendees ?? []).map((email) => ({ id: randomUUID(), email }))
        }
      },
      include: { attendees: true }
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /calendar/sync
 *
 * If the user has linked a Microsoft account (Graph tokens stored),
 * fetch upcoming calendar events from Outlook via Microsoft Graph,
 * deduplicate by outlookEventId, and store them locally.
 */
calendarRouter.post("/sync", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { msGraphAccessToken: true },
    });

    if (!user?.msGraphAccessToken) {
      res.status(400).json({
        error: "No Microsoft account linked. Please log in via SSO first.",
      });
      return;
    }

    const accessToken = await getValidAccessToken(req.auth!.userId);
    const outlookEvents = await fetchOutlookCalendarEvents(accessToken);

    // Batch-fetch existing outlook event ids to avoid N+1 queries
    const outlookIds = outlookEvents.map((e) => e.id);
    const existingEvents = await prisma.event.findMany({
      where: { outlookEventId: { in: outlookIds } },
      select: { outlookEventId: true },
    });
    const existingIds = new Set(existingEvents.map((e) => e.outlookEventId));

    const created = [];
    const skipped: string[] = [];

    for (const evt of outlookEvents) {
      if (existingIds.has(evt.id)) {
        skipped.push(evt.id);
        continue;
      }

      // Parse start/end — Graph returns { dateTime, timeZone }.
      // When timeZone is UTC, dateTime has no trailing "Z", so we append it.
      // For other timezones the dateTime is local; we still parse as-is
      // (the Date constructor handles ISO-8601 strings correctly).
      const startRaw = evt.start.dateTime;
      const startTime = new Date(
        evt.start.timeZone === "UTC" && !startRaw.endsWith("Z")
          ? startRaw + "Z"
          : startRaw,
      );
      const endRaw = evt.end.dateTime;
      const endTime = new Date(
        evt.end.timeZone === "UTC" && !endRaw.endsWith("Z")
          ? endRaw + "Z"
          : endRaw,
      );

      const event = await prisma.event.create({
        data: {
          id: randomUUID(),
          tenantId: req.auth!.tenantId,
          title: evt.subject || "(No subject)",
          startTime,
          endTime,
          location: evt.location?.displayName || null,
          outlookEventId: evt.id,
          createdByUserId: req.auth!.userId,
          attendees: {
            create: (evt.attendees ?? []).map((a) => ({
              id: randomUUID(),
              email: a.emailAddress.address,
            })),
          },
        },
        include: { attendees: true },
      });
      created.push(event);
    }

    res.status(201).json({
      source: "outlook",
      synced: created.length,
      skipped: skipped.length,
      events: created,
    });
  } catch (error) {
    next(error);
  }
});
