import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'settings.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const data = await backendFetch<unknown>('/settings/tenant', raw);
        return NextResponse.json(data);
      } catch {
        /* fall through to default */
      }
    }
  }

  return NextResponse.json({
    id: 'demo',
    name: 'Demo Organization',
    createdAt: '2025-01-01T00:00:00.000Z',
    userCount: 3,
    workflowCount: 0,
  });
}
