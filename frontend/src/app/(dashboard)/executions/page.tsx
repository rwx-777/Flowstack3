'use client';

import { useTranslations } from 'next-intl';

import { RecentExecutions } from '@/features/executions/components/recent-executions';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutions } from '@/features/dashboard/hooks';

export default function ExecutionsPage() {
  const t = useTranslations('executions');
  const { data: executions, isLoading } = useExecutions(200);

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header>
        <p className="label-xs mb-1">Modul</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{t('subtitle')}</p>
      </header>

      {isLoading || !executions ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">
              {executions.length} {t('title')}
            </h2>
          </div>
          <RecentExecutions executions={executions} limit={200} />
        </div>
      )}
    </div>
  );
}
