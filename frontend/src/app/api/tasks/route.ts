import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'tasks.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const tasks = await backendFetch<unknown[]>('/tasks', raw);
        return NextResponse.json({ tasks });
      } catch {
        /* fall through to empty array */
      }
    }
  }

  return NextResponse.json({ tasks: [] });
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['open', 'in_progress', 'done']).default('open'),
  assignedUserId: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'tasks.write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });

  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const task = await backendFetch('/tasks', raw, {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        return NextResponse.json(task, { status: 201 });
      } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
}
