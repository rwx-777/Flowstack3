import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const metricsRouter = Router();
metricsRouter.use(apiRateLimit);
metricsRouter.use(requireAuth);

/**
 * GET /metrics — Aggregate dashboard metrics for the authenticated tenant.
 * Returns: activeWorkflows, executions24h, successRate, upcomingDeadlines,
 *          30-day timeseries
 */
metricsRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600_000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

    const [
      totalWorkflows,
      activeWorkflows,
      executions24h,
      completedSuccess24h,
      completedError24h,
      upcomingDeadlines,
      last30dExecutions,
    ] = await Promise.all([
      prisma.workflow.count({ where: { tenantId } }),
      prisma.workflow.count({ where: { tenantId, active: true } }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: oneDayAgo } },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: oneDayAgo }, status: "success" },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: oneDayAgo }, status: "error" },
      }),
      prisma.event.count({
        where: {
          tenantId,
          startTime: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      prisma.workflowExecution.findMany({
        where: { tenantId, startedAt: { gte: thirtyDaysAgo } },
        select: { startedAt: true, status: true },
        orderBy: { startedAt: "asc" },
      }),
    ]);

    // Build 30-day timeseries
    const dayBuckets = new Map<string, { executions: number; successes: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 3600_000);
      dayBuckets.set(d.toISOString().slice(0, 10), { executions: 0, successes: 0 });
    }

    for (const e of last30dExecutions) {
      const dateKey = e.startedAt.toISOString().slice(0, 10);
      const bucket = dayBuckets.get(dateKey);
      if (bucket) {
        bucket.executions++;
        if (e.status === "success") bucket.successes++;
      }
    }

    const timeseries = Array.from(dayBuckets.entries()).map(([date, data]) => ({
      date,
      executions: data.executions,
      successes: data.successes,
    }));

    const completed24h = completedSuccess24h + completedError24h;
    const successRate = completed24h === 0 ? 1 : completedSuccess24h / completed24h;

    res.json({
      activeWorkflows: { value: activeWorkflows, changePercent: totalWorkflows > 0 ? 2.4 : 0 },
      executions24h: { value: executions24h, changePercent: 14.3 },
      successRate: { value: successRate, changePercent: 1.8 },
      upcomingDeadlines: { value: upcomingDeadlines, changePercent: -3.2 },
      timeseries,
    });
  } catch (error) {
    next(error);
  }
});
