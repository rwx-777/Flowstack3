import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'workflows.execute')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const body = await req.json().catch(() => ({}));
        const data = await backendFetch(`/emails/${encodeURIComponent(id)}/reply`, raw, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
}
