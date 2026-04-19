'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle2, Circle, Clock, Plus, Loader2, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type Task } from '@/features/tasks/hooks';

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

interface TenantUser {
  id: string;
  name: string;
  email: string;
}

function useUsers() {
  return useQuery({
    queryKey: ['settings-users'],
    queryFn: async (): Promise<TenantUser[]> => {
      const { data } = await axios.get<{ users: TenantUser[] }>('/api/settings/users');
      return data.users;
    },
    staleTime: 60_000,
  });
}

export function TaskList() {
  const t = useTranslations('tasks');
  const locale = useLocale();
  const { data: tasks, isLoading, error } = useTasks();
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(assignedUserId ? { assignedUserId } : {}),
      },
      {
        onSuccess: () => {
          setTitle('');
          setDueDate('');
          setAssignedUserId('');
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

  function handleDelete(task: Task) {
    deleteTask.mutate(task.id);
  }

  function getUserName(userId: string | null): string | null {
    if (!userId || !users) return null;
    const user = users.find((u) => u.id === userId);
    return user?.name ?? null;
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
    const order: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
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
          {users && users.length > 0 && (
            <div className="w-48">
              <label className="mb-1.5 block text-xs font-medium text-ink">{t('fields.assignee')}</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t('fields.unassigned')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              const assigneeName = getUserName(task.assignedUserId);
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
                    {assigneeName && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                        <User size={10} aria-hidden="true" />
                        {assigneeName}
                      </p>
                    )}
                  </div>
                  <span className="hidden text-xs text-ink-muted sm:inline">
                    {formatDate(task.dueDate, locale)}
                  </span>
                  <Badge variant={STATUS_TONE[task.status]}>{t(`status.${task.status}`)}</Badge>
                  <button
                    onClick={() => handleDelete(task)}
                    disabled={deleteTask.isPending}
                    className="shrink-0 text-ink-muted transition-colors hover:text-red-500 disabled:opacity-50"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
