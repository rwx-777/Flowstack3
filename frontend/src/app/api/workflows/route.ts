import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';
import { listWorkflows } from '@/server/services/workflow-service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'workflows.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const data = await backendFetch<{ workflows: unknown[] }>('/workflows', raw);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=30' } });
      } catch {
        /* fall through to mock data */
      }
    }
  }

  const workflows = await listWorkflows();
  return NextResponse.json({ workflows }, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
