'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginSchema } from '@/lib/validation';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function LoginForm({ ssoEnabled, ssoMode = 'nextauth' }: { ssoEnabled: boolean; ssoMode?: 'nextauth' | 'backend' }) {
  const t = useTranslations('auth.login');
  const tErr = useTranslations('auth.errors');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // Handle backend OAuth callback — the backend redirects to /?token=<jwt>
  // We pick up that token and exchange it for a NextAuth session.
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    // Remove token from URL to avoid leaking it in browser history
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());

    // Store the backend JWT and redirect to the dashboard
    void signIn('credentials-token', { token, redirect: false }).then((res) => {
      if (res?.ok) {
        router.push('/overview');
        router.refresh();
      }
    });
  }, [searchParams, router]);

  async function handleSso() {
    if (ssoMode === 'nextauth') {
      void signIn('azure-ad', { callbackUrl });
      return;
    }

    // Backend OAuth flow: fetch the authorize URL and redirect
    setSsoLoading(true);
    try {
      const res = await fetch('/api/auth/sso');
      if (!res.ok) {
        toast.error(tErr('generic'));
        setSsoLoading(false);
        return;
      }
      const data = (await res.json()) as { authorizeUrl: string };
      window.location.href = data.authorizeUrl;
    } catch {
      toast.error(tErr('generic'));
      setSsoLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'password') {
          try {
            next[field] = tErr(issue.message as 'invalidEmail' | 'passwordTooShort' | 'passwordTooLong');
          } catch {
            next[field] = issue.message;
          }
        }
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error(tErr('invalidCredentials'));
        setSubmitting(false);
        return;
      }
      router.push(callbackUrl as Parameters<typeof router.push>[0]);
      router.refresh();
    } catch {
      toast.error(tErr('generic'));
      setSubmitting(false);
    }
  }

  return (
    <>
      {ssoEnabled && (
        <>
          <Button
            variant="outline"
            className="w-full"
            disabled={ssoLoading}
            onClick={handleSso}
          >
            <MicrosoftIcon />
            {ssoLoading ? t('submitting') : t('ssoM365')}
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-3 text-xs text-ink-muted">{t('ssoSeparator')}</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label={t('password')}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-center text-xs text-ink-muted">
        {t('demoHint')}
      </p>
    </>
  );
}
