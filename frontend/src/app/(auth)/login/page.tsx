import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const tApp = await getTranslations('app');
  const t = await getTranslations('auth.login');

  const hasAzureAd = !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  );
  const hasBackend = !!process.env.BACKEND_API_URL;

  // Show Microsoft SSO when NextAuth Azure AD provider is configured OR
  // when the backend is available (it has its own Microsoft OAuth flow).
  const ssoEnabled = hasAzureAd || hasBackend;
  const ssoMode: 'nextauth' | 'backend' = hasAzureAd ? 'nextauth' : 'backend';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <span className="relative mb-4 flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 rounded-lg bg-primary-soft" />
            <svg className="relative text-primary" width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12 L16 6 L24 12 L24 20 L16 26 L8 20 Z" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{tApp('name')}</h1>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-ink-subtle">
            {tApp('tagline')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
            </div>

            <LoginForm ssoEnabled={ssoEnabled} ssoMode={ssoMode} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
