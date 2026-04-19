import type { Session } from 'next-auth';
import type { BackendUser } from './backend-client';

/**
 * Default tenant ID used when the frontend session does not carry one.
 * Matches the demo tenant created by `GET /auth/callback?email=...&tenant=...`.
 */
const DEFAULT_TENANT_ID = 'default';

/**
 * Map a NextAuth session into the shape the backend JWT expects.
 * The frontend session has `user.id`, `user.email`, `user.role`; the backend
 * additionally needs a `tenantId`.
 */
export function sessionToBackendUser(session: Session): BackendUser | null {
  const user = session.user;
  if (!user?.id || !user?.email) return null;

  return {
    userId: user.id,
    tenantId: ((user as Record<string, unknown>).tenantId as string | undefined) ?? DEFAULT_TENANT_ID,
    email: user.email,
    role: user.role ?? 'read',
  };
}
