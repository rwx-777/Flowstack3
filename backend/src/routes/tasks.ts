import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const taskRouter = Router();
taskRouter.use(apiRateLimit);
taskRouter.use(requireAuth);

const taskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["open", "in_progress", "done"]).default("open"),
  assignedUserId: z.string().optional()
});

taskRouter.get("/", async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({ where: { tenantId: req.auth!.tenantId } });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

taskRouter.post("/", async (req, res, next) => {
  try {
    const payload = taskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        id: randomUUID(),
        tenantId: req.auth!.tenantId,
        title: payload.title,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        status: payload.status,
        assignedUserId: payload.assignedUserId ?? req.auth!.userId
      }
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

taskRouter.patch("/:id", async (req, res, next) => {
  try {
    const payload = taskSchema.partial().parse(req.body);
    const updated = await prisma.task.updateMany({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.dueDate ? { dueDate: new Date(payload.dueDate) } : {}),
        ...(payload.assignedUserId ? { assignedUserId: payload.assignedUserId } : {})
      }
    });

    if (!updated.count) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    res.json(task);
  } catch (error) {
    next(error);
  }
});
