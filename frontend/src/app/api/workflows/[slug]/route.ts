import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';
import { findWorkflow } from '@/server/services/workflow-service';
import { listExecutionsByWorkflow } from '@/server/services/execution-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'workflows.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const data = await backendFetch<{ workflow: unknown; executions: unknown[] }>(
          `/workflows/${encodeURIComponent(slug)}`,
          raw,
        );
        return NextResponse.json(data);
      } catch {
        /* fall through to mock data */
      }
    }
  }

  const workflow = await findWorkflow(slug);
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const executions = await listExecutionsByWorkflow(slug, 20);
  return NextResponse.json({ workflow, executions });
}
