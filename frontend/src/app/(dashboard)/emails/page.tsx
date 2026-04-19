'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { Mail, RefreshCw, Send, Inbox, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const emailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
  aiResponse: z.string().nullable().optional(),
  parsedIntent: z.string().nullable().optional(),
  createdAt: z.string(),
});

type Email = z.infer<typeof emailSchema>;

const emailsResponse = z.object({
  emails: z.array(emailSchema),
});

async function fetchEmails(): Promise<Email[]> {
  const { data } = await axios.get('/api/emails');
  return emailsResponse.parse(data).emails;
}

const DEFAULT_STATUS_CONFIG = { icon: Clock, variant: 'neutral' as const };

const STATUS_CONFIG: Record<string, { icon: typeof Clock; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'info' }> = {
  queued: { icon: Clock, variant: 'neutral' },
  processing: { icon: RefreshCw, variant: 'info' },
  processed: { icon: CheckCircle2, variant: 'success' },
};

export default function EmailsPage() {
  const t = useTranslations('emails');
  const tNav = useTranslations('nav');
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: emails, isLoading } = useQuery({
    queryKey: ['emails'],
    queryFn: fetchEmails,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => axios.post('/api/emails', { emails: [] }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });

  const replyMutation = useMutation({
    mutationFn: (emailId: string) => axios.post(`/api/emails/${emailId}/reply`, {}),
  });

  const selected = emails?.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label-xs mb-1">{tNav('module')}</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} aria-hidden="true" />
          {syncMutation.isPending ? t('syncing') : t('sync')}
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !emails || emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-8 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Inbox size={24} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ink">{t('empty')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Email list */}
          <div className="rounded-lg border border-border bg-surface lg:col-span-1">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-ink">
                {emails.length} {t('messages')}
              </h2>
            </div>
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {emails.map((email) => {
                const isActive = email.id === selectedId;
                const cfg = STATUS_CONFIG[email.status] ?? DEFAULT_STATUS_CONFIG;
                return (
                  <li key={email.id}>
                    <button
                      onClick={() => setSelectedId(email.id)}
                      className={`w-full text-left px-5 py-3.5 transition-colors hover:bg-surface-muted/40 ${isActive ? 'bg-surface-muted/60' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={cfg.variant}>
                          {email.status}
                        </Badge>
                        {email.parsedIntent && (
                          <Badge variant="info">{email.parsedIntent}</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-ink">{email.subject}</p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {new Date(email.createdAt).toLocaleString('de-DE')}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Email detail */}
          <div className="rounded-lg border border-border bg-surface p-6 lg:col-span-2">
            {selected ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{selected.subject}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={STATUS_CONFIG[selected.status]?.variant ?? DEFAULT_STATUS_CONFIG.variant}>
                      {selected.status}
                    </Badge>
                    {selected.parsedIntent && (
                      <Badge variant="info">{selected.parsedIntent}</Badge>
                    )}
                    <span className="text-xs text-ink-muted">
                      {new Date(selected.createdAt).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="label-xs mb-2">{t('body')}</p>
                  <div className="rounded-lg border border-border bg-bg p-4 text-sm text-ink whitespace-pre-wrap">
                    {selected.body}
                  </div>
                </div>

                {selected.aiResponse && (
                  <div>
                    <p className="label-xs mb-2">{t('aiDraft')}</p>
                    <div className="rounded-lg border border-border bg-success-soft/30 p-4 text-sm text-ink whitespace-pre-wrap">
                      {selected.aiResponse}
                    </div>
                    <button
                      onClick={() => replyMutation.mutate(selected.id)}
                      disabled={replyMutation.isPending}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send size={14} aria-hidden="true" />
                      {replyMutation.isPending ? t('sending') : t('sendReply')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
                <Mail size={32} aria-hidden="true" />
                <p className="mt-3 text-sm">{t('selectEmail')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
