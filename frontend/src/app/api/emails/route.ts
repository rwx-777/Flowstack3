import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'workflows.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const emails = await backendFetch<unknown[]>('/emails', raw);
        return NextResponse.json({ emails });
      } catch {
        /* fall through to empty */
      }
    }
  }

  return NextResponse.json({ emails: [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'workflows.execute')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const body = await req.json();
        const data = await backendFetch('/emails/sync', raw, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return NextResponse.json(data, { status: 201 });
      } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
}
