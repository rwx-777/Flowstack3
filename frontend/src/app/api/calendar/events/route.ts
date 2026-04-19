import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/server/auth/config';
import { can } from '@/lib/rbac';
import { isBackendConfigured, backendFetch } from '@/lib/backend-client';
import { listUpcomingEvents } from '@/server/services/calendar-service';
import type { CalendarEvent } from '@/lib/validation';

/** Map backend Event model to the CalendarEvent shape the frontend expects. */
function mapBackendEvent(e: Record<string, unknown>): CalendarEvent | null {
  if (!e.id || !e.title || !e.startTime || !e.endTime) return null;
  return {
    id: String(e.id),
    subject: String(e.title),
    start: String(e.startTime),
    end: String(e.endTime),
    location: typeof e.location === 'string' ? e.location : null,
    attendees: Array.isArray(e.attendees)
      ? (e.attendees as Array<Record<string, string>>).map((a) => ({
          email: a.email ?? '',
          name: a.email ?? '',
        }))
      : [],
    kind: 'meeting',
    relatedWorkflowSlug: null,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(session.user.role, 'calendar.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(searchParams.get('days') ?? 14)));

  // Try backend first
  if (isBackendConfigured()) {
    const raw = await getToken({ req, raw: true });
    if (raw) {
      try {
        const rawEvents = await backendFetch<Record<string, unknown>[]>('/calendar/events', raw);
        const events = rawEvents.map(mapBackendEvent).filter((e): e is CalendarEvent => e !== null);
        return NextResponse.json({ events });
      } catch {
        /* fall through to mock data */
      }
    }
  }

  // Fallback to mock data
  const events = await listUpcomingEvents(days);
  return NextResponse.json({ events });
}
