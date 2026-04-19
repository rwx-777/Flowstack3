# Flowstack3

Cloud-ready multi-tenant SaaS MVP for professional service firms (law and insurance) with:

- Microsoft SSO endpoints (`/auth/login`, `/auth/callback`, `/auth/logout`)
- Email ingestion + AI drafting workflow
- Task automation from email intent
- Calendar events API and dashboard shell
- Next.js dashboard pages (Login, Dashboard, Inbox, Calendar, Clients)

## Repository Structure

- `/backend` — Node.js + TypeScript REST API, Prisma ORM, BullMQ queue worker
- `/frontend` — Next.js dashboard UI
- `/docker-compose.yml` — local full-stack environment (Postgres, Redis, API, worker, UI)
- `/.github/workflows/ci.yml` — CI for lint, test, build

## Backend Highlights

- Multi-tenant data model: `Tenant`, `User`, `Client`, `Email`, `Task`, `Event`, `Attendee`, `Reminder`
- Tenant isolation enforced by JWT-authenticated `tenantId` filtering on API routes
- Email processing pipeline:
  1. `POST /emails/sync` stores emails
  2. queue/worker calls LLM abstraction (`analyze`, `generateReply`)
  3. AI draft is persisted
  4. automation creates tasks/events from inferred intent
- Sensitive email body can be encrypted at rest (AES-256-GCM)

## Frontend Pages

- `/login`
- `/dashboard`
- `/inbox`
- `/calendar`
- `/clients`

## Local Setup

### 1) Backend

```bash
cd /home/runner/work/Flowstack3/Flowstack3/backend
cp .env.example .env
npm ci
npm run prisma:generate
npm run lint
npm run test
npm run build
npm run dev
```

### 2) Frontend

```bash
cd /home/runner/work/Flowstack3/Flowstack3/frontend
cp .env.example .env.local
npm ci
npm run lint
npm run build
npm run dev
```

### 3) Full Stack via Docker Compose

```bash
cd /home/runner/work/Flowstack3/Flowstack3
docker compose up --build
```

## Example API Endpoints

- `GET /auth/login`
- `GET /auth/callback`
- `GET /auth/logout`
- `GET /emails`
- `POST /emails/sync`
- `POST /emails/:id/reply`
- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `GET /calendar/events`
- `POST /calendar/events`

## Notes

- Configure real Microsoft Entra ID credentials via backend environment variables.
- For local development, auth callback supports demo query params (`email`, `tenant`, `role`).
- Queue processing supports inline mode (`QUEUE_INLINE_MODE=true`) and Redis-backed worker mode.
