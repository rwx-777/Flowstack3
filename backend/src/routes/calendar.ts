import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

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
