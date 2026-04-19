import { SignJWT } from 'jose';

import { env } from './env';
import { logger } from './logger';

/**
 * Lightweight HTTP client for the Express backend at BACKEND_API_URL.
 *
 * When both BACKEND_API_URL and BACKEND_JWT_SECRET are set the client mints a
 * short-lived JWT compatible with the backend's `requireAuth` middleware and
 * forwards requests. When either is missing the client is disabled and callers
 * should fall back to mock / in-memory data.
 */

export interface BackendUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

const textEncoder = new TextEncoder();

async function mintJwt(user: BackendUser): Promise<string> {
  const secret = env.BACKEND_JWT_SECRET;
  if (!secret) throw new Error('BACKEND_JWT_SECRET is not configured');

  return new SignJWT({
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(textEncoder.encode(secret));
}

export function isBackendConfigured(): boolean {
  return Boolean(env.BACKEND_API_URL && env.BACKEND_JWT_SECRET);
}

export async function backendFetch<T = unknown>(
  path: string,
  user: BackendUser,
  init?: RequestInit,
): Promise<T> {
  if (!env.BACKEND_API_URL || !env.BACKEND_JWT_SECRET) {
    throw new Error('Backend API is not configured');
  }

  const token = await mintJwt(user);
  const url = `${env.BACKEND_API_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('Backend request failed', { status: res.status, url, body: body.slice(0, 200) });
    throw new Error(`Backend ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}
