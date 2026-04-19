import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const settingsRouter = Router();
settingsRouter.use(apiRateLimit);
settingsRouter.use(requireAuth);

/**
 * GET /settings/users — List all users for the tenant.
 * Requires admin or user role (backend treats both as valid).
 */
settingsRouter.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.auth!.tenantId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.displayName,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }));

    res.json({ users: mapped });
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  displayName: z.string().min(1).optional(),
});

/**
 * PATCH /settings/users/:id — Update a user (role, displayName).
 * Only admins should call this. Frontend enforces via RBAC.
 */
settingsRouter.patch("/users/:id", async (req, res, next) => {
  try {
    if (req.auth!.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin role required" });
      return;
    }

    const userId = String(req.params.id);
    const payload = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.auth!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.displayName ? { displayName: payload.displayName } : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.displayName,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /settings/users/:id — Remove a user from the tenant.
 * Only admins can do this. Cannot delete yourself.
 */
settingsRouter.delete("/users/:id", async (req, res, next) => {
  try {
    if (req.auth!.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin role required" });
      return;
    }

    const userId = String(req.params.id);

    if (userId === req.auth!.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.auth!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id: userId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /settings/tenant — Get tenant details.
 */
settingsRouter.get("/tenant", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.auth!.tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, workflows: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      createdAt: tenant.createdAt.toISOString(),
      userCount: tenant._count.users,
      workflowCount: tenant._count.workflows,
    });
  } catch (error) {
    next(error);
  }
});
