'use client';

import { useTranslations } from 'next-intl';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  const t = useTranslations('tasks');

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header>
        <p className="label-xs mb-1">Modul</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-8 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <CheckSquare size={24} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1.5 max-w-md text-center text-sm text-ink-muted">
          {t('subtitle')}
        </p>
      </div>
    </div>
  );
}
