import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';
import { listUsers } from '@/server/services/user-service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'users.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const data = await backendFetch<{ users: unknown[] }>('/settings/users', raw);
        return NextResponse.json(data);
      } catch {
        /* fall through to mock data */
      }
    }
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}
