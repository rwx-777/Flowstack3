import { NextResponse } from 'next/server';
import { isBackendConfigured } from '@/lib/backend-client';

/**
 * GET /api/auth/sso
 *
 * Fetches the Microsoft OAuth authorize URL from the backend's /auth/login
 * endpoint and returns it so the frontend can redirect the user.
 */
export async function GET(): Promise<NextResponse> {
  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: 'Backend not configured' },
      { status: 503 },
    );
  }

  try {
    // Backend /auth/login does not require auth — fetch without a JWT
    const url = `${process.env.BACKEND_API_URL}/auth/login`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to get SSO URL from backend' },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { authorizeUrl: string };
    return NextResponse.json({ authorizeUrl: data.authorizeUrl });
  } catch {
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 },
    );
  }
}
