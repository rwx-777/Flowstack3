import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";

export const workflowRouter = Router();
workflowRouter.use(apiRateLimit);
workflowRouter.use(requireAuth);

/**
 * GET /workflows — List all workflows for the authenticated tenant.
 * Returns: slug, name, category, description, triggerType, nodeCount,
 * connectionCount, active, lastRunAt, successRate, avgDurationMs
 */
workflowRouter.get("/", async (req, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { name: "asc" },
    });

    const mapped = workflows.map((w) => ({
      slug: w.slug,
      name: w.name,
      category: w.category,
      description: w.description,
      triggerType: w.triggerType,
      nodeCount: w.nodeCount,
      connectionCount: w.connectionCount,
      active: w.active,
      lastRunAt: w.lastRunAt?.toISOString() ?? null,
      successRate: w.successRate,
      avgDurationMs: w.avgDurationMs,
    }));

    res.json({ workflows: mapped });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workflows/:slug — Get a single workflow by slug with its recent execution history.
 */
workflowRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug);

    const workflow = await prisma.workflow.findFirst({
      where: { slug, tenantId: req.auth!.tenantId },
    });

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: workflow.id, tenantId: req.auth!.tenantId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    const mappedWorkflow = {
      slug: workflow.slug,
      name: workflow.name,
      category: workflow.category,
      description: workflow.description,
      triggerType: workflow.triggerType,
      nodeCount: workflow.nodeCount,
      connectionCount: workflow.connectionCount,
      active: workflow.active,
      lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
      successRate: workflow.successRate,
      avgDurationMs: workflow.avgDurationMs,
    };

    const mappedExecutions = executions.map((e) => ({
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

    res.json({ workflow: mappedWorkflow, executions: mappedExecutions });
  } catch (error) {
    next(error);
  }
});
