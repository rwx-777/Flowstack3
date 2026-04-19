'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle2, Circle, Clock, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTasks, useCreateTask, useUpdateTask, type Task } from '@/features/tasks/hooks';

const STATUS_ICON = {
  open: Circle,
  in_progress: Clock,
  done: CheckCircle2,
} as const;

const STATUS_TONE = {
  open: 'neutral',
  in_progress: 'warning',
  done: 'success',
} as const;

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaskList() {
  const t = useTranslations('tasks');
  const locale = useLocale();
  const { data: tasks, isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      },
      {
        onSuccess: () => {
          setTitle('');
          setDueDate('');
          setShowForm(false);
        },
      },
    );
  }

  function cycleStatus(task: Task) {
    const next: Record<string, 'open' | 'in_progress' | 'done'> = {
      open: 'in_progress',
      in_progress: 'done',
      done: 'open',
    };
    updateTask.mutate({ id: task.id, status: next[task.status] });
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface px-8 py-12 text-center">
        <p className="text-sm text-ink-muted">{t('backendRequired')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-surface px-8 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  const sorted = [...(tasks ?? [])].sort((a, b) => {
    const order = { open: 0, in_progress: 1, done: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="space-y-4">
      {/* Create task button / form */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="mr-1.5" />
          {t('create')}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div className="min-w-[240px] flex-1">
            <Input
              label={t('fields.title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-ink">{t('fields.dueDate')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" disabled={createTask.isPending || !title.trim()}>
            {createTask.isPending ? t('creating') : t('create')}
          </Button>
        </form>
      )}

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-8 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ink">{t('empty')}</h2>
          <p className="mt-1.5 max-w-md text-center text-sm text-ink-muted">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">
              {sorted.length} {t('title')}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {sorted.map((task) => {
              const Icon = STATUS_ICON[task.status];
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-muted/50"
                >
                  <button
                    onClick={() => cycleStatus(task)}
                    className="shrink-0 text-ink-muted transition-colors hover:text-primary"
                    aria-label={t('cycleStatus')}
                  >
                    <Icon size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        task.status === 'done' ? 'text-ink-muted line-through' : 'text-ink',
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  <span className="hidden text-xs text-ink-muted sm:inline">
                    {formatDate(task.dueDate, locale)}
                  </span>
                  <Badge variant={STATUS_TONE[task.status]}>{t(`status.${task.status}`)}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
