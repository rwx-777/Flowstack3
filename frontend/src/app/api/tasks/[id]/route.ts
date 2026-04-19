import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';
import { sessionToBackendUser } from '@/lib/session-bridge';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['open', 'in_progress', 'done']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedUserId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'tasks.write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });

  if (isBackendConfigured()) {
    const backendUser = sessionToBackendUser(session);
    if (backendUser) {
      try {
        const task = await backendFetch(`/tasks/${id}`, backendUser, {
          method: 'PATCH',
          body: JSON.stringify(parsed.data),
        });
        return NextResponse.json(task);
      } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
}
