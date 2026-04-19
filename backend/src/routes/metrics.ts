import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const metricsRouter = Router();
metricsRouter.use(apiRateLimit);
metricsRouter.use(requireAuth);

const rangeSchema = z.enum(["24h", "7d", "30d", "90d"]).default("24h");

const RANGE_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
  "90d": 2160,
};

/**
 * GET /metrics — Aggregate dashboard metrics for the authenticated tenant.
 * Query params:
 *   range = 24h | 7d | 30d | 90d (default 24h)
 *
 * Returns: activeWorkflows, executions, successRate, upcomingDeadlines,
 *          30-day timeseries. changePercent is computed as period-over-period.
 */
metricsRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const range = rangeSchema.parse(req.query.range);
    const rangeMs = RANGE_HOURS[range] * 3600_000;

    const now = new Date();
    const periodStart = new Date(now.getTime() - rangeMs);
    const prevPeriodStart = new Date(now.getTime() - rangeMs * 2);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

    const [
      totalWorkflows,
      activeWorkflows,
      executionsCurrent,
      executionsPrev,
      successCurrent,
      errorCurrent,
      successPrev,
      errorPrev,
      upcomingDeadlines,
      last30dExecutions,
    ] = await Promise.all([
      prisma.workflow.count({ where: { tenantId } }),
      prisma.workflow.count({ where: { tenantId, active: true } }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: periodStart } },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: prevPeriodStart, lt: periodStart } },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: periodStart }, status: "success" },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: periodStart }, status: "error" },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: prevPeriodStart, lt: periodStart }, status: "success" },
      }),
      prisma.workflowExecution.count({
        where: { tenantId, startedAt: { gte: prevPeriodStart, lt: periodStart }, status: "error" },
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

    // Compute real changePercent (period-over-period)
    function changePercent(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    const completedCurrent = successCurrent + errorCurrent;
    const completedPrev = successPrev + errorPrev;
    const successRateCurrent = completedCurrent === 0 ? 1 : successCurrent / completedCurrent;
    const successRatePrev = completedPrev === 0 ? 1 : successPrev / completedPrev;

    // For workflows changePercent: since we don't snapshot historical state,
    // return 0 when no meaningful comparison can be made.
    const workflowChangePercent = 0;

    res.json({
      activeWorkflows: {
        value: activeWorkflows,
        changePercent: workflowChangePercent,
      },
      executions24h: {
        value: executionsCurrent,
        changePercent: changePercent(executionsCurrent, executionsPrev),
      },
      successRate: {
        value: successRateCurrent,
        changePercent: Math.round((successRateCurrent - successRatePrev) * 1000) / 10,
      },
      upcomingDeadlines: {
        value: upcomingDeadlines,
        changePercent: 0, // No historical comparison for upcoming events
      },
      timeseries,
    });
  } catch (error) {
    next(error);
  }
});
