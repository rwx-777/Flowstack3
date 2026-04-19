import { env } from './env';
import { logger } from './logger';

/**
 * Lightweight HTTP client for the Express backend at BACKEND_API_URL.
 *
 * The caller supplies a raw NextAuth session JWT (obtained via
 * `getToken({ req, raw: true })` from `next-auth/jwt`).  Because the backend
 * shares the same signing secret (`JWT_SECRET` = `NEXTAUTH_SECRET`), the token
 * is verified directly — no bridge JWT minting is needed.
 */

export function isBackendConfigured(): boolean {
  return Boolean(env.BACKEND_API_URL);
}

export async function backendFetch<T = unknown>(
  path: string,
  rawToken: string,
  init?: RequestInit,
): Promise<T> {
  if (!env.BACKEND_API_URL) {
    throw new Error('Backend API is not configured');
  }

  const url = `${env.BACKEND_API_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rawToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const status = res.status;
    logger.warn('Backend request failed', { status, url });
    throw new Error(`Backend responded with status ${status}`);
  }

  return (await res.json()) as T;
}
