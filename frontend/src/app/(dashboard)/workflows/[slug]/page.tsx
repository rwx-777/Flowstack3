'use client';

import { use, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { z } from 'zod';
import { ChevronLeft } from 'lucide-react';

import { workflowSchema, executionSchema, type Workflow, type Execution } from '@/lib/validation';
import { RecentExecutions } from '@/features/executions/components/recent-executions';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_BY_SLUG } from '@/lib/workflow-categories';
import { cn } from '@/lib/cn';

const detailResponse = z.object({
  workflow: workflowSchema,
  executions: z.array(executionSchema),
});

async function fetchWorkflowDetail(slug: string): Promise<{ workflow: Workflow; executions: readonly Execution[] }> {
  const { data } = await axios.get(`/api/workflows/${slug}`);
  return detailResponse.parse(data);
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations('workflows');
  const tTrigger = useTranslations('workflows.trigger');

  const { data, isLoading } = useQuery({
    queryKey: ['workflow', slug],
    queryFn: () => fetchWorkflowDetail(slug),
    staleTime: 30_000,
  });

  const workflow = data?.workflow;
  const executions = data?.executions;

  const cat = useMemo(
    () => (workflow ? CATEGORY_BY_SLUG[workflow.category] : null),
    [workflow],
  );

  if (isLoading || !workflow) {
    return (
      <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const successPct = Math.round(workflow.successRate * 100);

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/workflows"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{workflow.name}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">{workflow.description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="label-xs">{t('columns.category')}</p>
          {cat && (
            <p className={cn('mt-2 text-sm font-semibold', `text-${cat.token}`)}>
              {t(`categories.${workflow.category}` as 'categories.client-lifecycle')}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="label-xs">{t('columns.trigger')}</p>
          <p className="mt-2 text-sm font-semibold text-ink">{tTrigger(workflow.triggerType)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="label-xs">{t('columns.successRate')}</p>
          <p className="nums mt-2 text-sm font-semibold text-ink">{successPct} %</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="label-xs">{t('columns.nodes')}</p>
          <p className="nums mt-2 text-sm font-semibold text-ink">{workflow.nodeCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">
            {t('detail.executionsCount', { count: executions?.length ?? 0 })}
          </h2>
        </div>
        {executions && executions.length > 0 ? (
          <RecentExecutions executions={executions} limit={20} />
        ) : (
          <p className="px-6 py-8 text-sm text-ink-muted">{t('detail.noExecutions')}</p>
        )}
      </div>
    </div>
  );
}
