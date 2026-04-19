import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const executionRouter = Router();
executionRouter.use(apiRateLimit);
executionRouter.use(requireAuth);

/**
 * GET /executions — List workflow executions for the authenticated tenant.
 * Query params:
 *   - limit (default 50, max 200)
 * Returns: id, workflowSlug, workflowName, status, startedAt, completedAt,
 *          durationMs, triggeredBy, errorMessage
 */
executionRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));

    const executions = await prisma.workflowExecution.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    const mapped = executions.map((e) => ({
      id: e.id,
      workflowSlug: e.workflowSlug,
      workflowName: e.workflowName,
      status: e.status,
      startedAt: e.startedAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      durationMs: e.durationMs,
      triggeredBy: e.triggeredBy,
      errorMessage: e.errorMessage ?? null,
    }));

    res.json({ executions: mapped });
  } catch (error) {
    next(error);
  }
});
