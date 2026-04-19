'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarWeek } from '@/features/calendar/components/calendar-week';
import { UpcomingEvents } from '@/features/calendar/components/upcoming-events';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendarEvents } from '@/features/dashboard/hooks';

export default function CalendarPage() {
  const t = useTranslations('calendar');
  const tNav = useTranslations('nav');
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useCalendarEvents(14);

  const syncMutation = useMutation({
    mutationFn: () => axios.post('/api/calendar/sync'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  });

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label-xs mb-1">{tNav('module')}</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} aria-hidden="true" />
            {syncMutation.isPending ? t('syncing') : t('sync')}
          </button>
          <div className="flex items-center gap-2">
            <button
              aria-label="Vorherige Woche"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <div className="min-w-[220px] rounded-lg border border-border bg-surface px-4 py-2 text-center text-sm font-semibold text-ink">
              Diese Woche
            </div>
            <button
              aria-label="Nächste Woche"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {isLoading || !events ? (
          <>
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[500px]" />
          </>
        ) : (
          <>
            <CalendarWeek events={events} />
            <aside className="rounded-lg border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-ink">Anstehend</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Nächste 5 Termine</p>
              </div>
              <UpcomingEvents events={events} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
