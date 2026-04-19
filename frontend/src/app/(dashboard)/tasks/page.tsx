'use client';

import { useTranslations } from 'next-intl';
import { TaskList } from '@/features/tasks/components/task-list';

export default function TasksPage() {
  const t = useTranslations('tasks');
  const tNav = useTranslations('nav');

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header>
        <p className="label-xs mb-1">{tNav('module')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{t('subtitle')}</p>
      </header>

      <TaskList />
    </div>
  );
}
