'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { Users, Building2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const usersResponse = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
      createdAt: z.string(),
    }),
  ),
});

const tenantResponse = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  userCount: z.number(),
  workflowCount: z.number(),
});

type TenantInfo = z.infer<typeof tenantResponse>;

async function fetchUsers() {
  const { data } = await axios.get('/api/settings/users');
  return usersResponse.parse(data).users;
}

async function fetchTenant(): Promise<TenantInfo> {
  const { data } = await axios.get('/api/settings/tenant');
  return tenantResponse.parse(data);
}

const ROLE_VARIANT = {
  admin: 'primary' as const,
  write: 'info' as const,
  read: 'neutral' as const,
  user: 'neutral' as const,
};

export default function SettingsPage() {
  const t = useTranslations('nav');
  const tSettings = useTranslations('settings');
  const locale = useLocale();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['settings-users'],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['settings-tenant'],
    queryFn: fetchTenant,
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 space-y-8">
      <header>
        <p className="label-xs mb-1">{t('administration')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('settings')}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{tSettings('subtitle')}</p>
      </header>

      {/* Tenant info */}
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Building2 size={20} aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-ink">{tSettings('organization')}</h2>
        </div>
        {tenantLoading || !tenant ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="label-xs">{tSettings('orgName')}</p>
              <p className="mt-1 text-sm font-medium text-ink">{tenant.name}</p>
            </div>
            <div>
              <p className="label-xs">{tSettings('userCount')}</p>
              <p className="nums mt-1 text-sm font-medium text-ink">{tenant.userCount}</p>
            </div>
            <div>
              <p className="label-xs">{tSettings('workflowCount')}</p>
              <p className="nums mt-1 text-sm font-medium text-ink">{tenant.workflowCount}</p>
            </div>
          </div>
        )}
      </section>

      {/* Users */}
      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info">
            <Users size={16} aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-ink">{tSettings('users')}</h2>
          {users && (
            <span className="nums rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-ink-muted">
              {users.length}
            </span>
          )}
        </div>
        {usersLoading || !users ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-ink-muted">{tSettings('name')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-ink-muted">{tSettings('email')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-ink-muted">{tSettings('role')}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-ink-muted">{tSettings('joined')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
                          {user.name
                            .split(/[\s@.]/)
                            .map((p) => p[0]?.toUpperCase() ?? '')
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <span className="font-medium text-ink">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-ink-muted">{user.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={ROLE_VARIANT[user.role as keyof typeof ROLE_VARIANT] ?? 'neutral'}>
                        <Shield size={10} aria-hidden="true" />
                        {user.role}
                      </Badge>
                    </td>
                    <td className="nums px-6 py-3.5 text-ink-muted">
                      {new Date(user.createdAt).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
