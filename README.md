# Flowstack3

Cloud-ready multi-tenant SaaS MVP for professional service firms (law and insurance) with:

- Microsoft SSO endpoints (`/auth/login`, `/auth/callback`, `/auth/logout`)
- Email ingestion + AI drafting workflow
- Task automation from email intent
- Calendar events API and dashboard shell
- Next.js dashboard pages (Login, Dashboard, Inbox, Calendar, Clients)

## Repository Structure

```
/backend              — Node.js + TypeScript REST API, Prisma ORM, BullMQ queue worker
/frontend             — Next.js dashboard UI
/docker-compose.yml   — local full-stack environment (Postgres, Redis, API, worker, UI)
/.github/workflows/   — CI for lint, test, build
```

---

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | 22+ | Runtime for backend & frontend |
| **npm** | 10+ | Package manager (ships with Node) |
| **PostgreSQL** | 16+ | Database (or use Docker Compose) |
| **Redis** | 7+ | Queue backend (or use Docker Compose) |
| **Docker & Docker Compose** | latest | Only needed if you prefer the Docker workflow |

---

## Option A — Docker Compose (Quickest Start)

Docker Compose spins up Postgres, Redis, the backend API, a BullMQ worker, and the Next.js frontend in one command. No local installs beyond Docker are required.

### First-Time Setup

```bash
# From the project root:
docker compose up --build
```

This builds all images, runs database migrations automatically, and starts every service.

- **Frontend** → <http://localhost:3000>
- **Backend API** → <http://localhost:4000>
- **Postgres** → `localhost:5432` (user `postgres`, password `postgres`, db `flowstack3`)
- **Redis** → `localhost:6379`

### Subsequent Runs

```bash
# Start all services (no rebuild needed unless code changed):
docker compose up

# If you changed code or dependencies, rebuild first:
docker compose up --build

# Stop everything:
docker compose down

# Stop and remove persisted database data:
docker compose down -v
```

---

## Option B — Manual Setup (Without Docker)

Use this approach if you want to run the backend and frontend directly on your machine. You will need Postgres and Redis running locally (or pointed to remote instances).

### First-Time Setup

#### 1. Backend

```bash
cd backend

# Create your local environment file and edit it:
cp .env.example .env
# Open .env and update values as needed (see "Environment Variables" below)

# Install dependencies:
npm ci

# Generate the Prisma client:
npm run prisma:generate

# Run database migrations (creates tables in Postgres):
npm run prisma:migrate

# Verify everything compiles and tests pass:
npm run lint
npm run test
npm run build

# Start the dev server (hot-reload):
npm run dev
```

The backend API will be running at <http://localhost:4000>.

#### 2. Frontend

```bash
cd frontend

# Install dependencies:
npm ci

# Verify everything compiles:
npm run lint
npm run build

# Start the dev server (hot-reload):
npm run dev
```

The frontend will be running at <http://localhost:3000>.

### Subsequent Runs

Once the initial setup is complete, you only need to start the dev servers:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Re-run `npm ci` only if `package-lock.json` changed (e.g., after a `git pull`).
Re-run `npm run prisma:migrate` only if there are new migration files.
Re-run `npm run prisma:generate` only if the Prisma schema changed.

---

## Environment Variables

The backend requires a `.env` file. Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port the API listens on |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/flowstack3` | Postgres connection string — change `db` to `localhost` for manual setup |
| `JWT_SECRET` | *(must set)* | Secret for signing JWTs (≥ 32 chars) |
| `ENCRYPTION_KEY` | *(must set)* | Key for AES-256-GCM email encryption (≥ 32 chars) |
| `MICROSOFT_CLIENT_ID` | *(empty)* | Microsoft Entra ID app client ID |
| `MICROSOFT_CLIENT_SECRET` | *(empty)* | Microsoft Entra ID app client secret |
| `MICROSOFT_TENANT_ID` | `common` | Microsoft Entra tenant ID |
| `MICROSOFT_REDIRECT_URI` | `http://localhost:4000/auth/callback` | OAuth redirect URI |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string — change `redis` to `localhost` for manual setup |
| `QUEUE_INLINE_MODE` | `true` | Set to `true` to process jobs inline (no Redis needed), `false` for the BullMQ worker |

> **Tip for manual setup:** Change the hostnames in `DATABASE_URL` and `REDIS_URL` from `db`/`redis` to `localhost` since those Docker service names won't resolve outside of Docker.

---

## Available Scripts

### Backend (`cd backend`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the API with hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled API (`node dist/src/index.js`) |
| `npm run worker` | Start the BullMQ worker process |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run test` | Run tests with Vitest |
| `npm run prisma:generate` | Generate the Prisma client from the schema |
| `npm run prisma:migrate` | Create/apply database migrations |

### Frontend (`cd frontend`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start Next.js dev server with hot-reload |
| `npm run build` | Build the production bundle |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

---

## Example API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/login` | Redirect to Microsoft SSO |
| `GET` | `/auth/callback` | OAuth callback |
| `GET` | `/auth/logout` | Log out |
| `GET` | `/emails` | List emails |
| `POST` | `/emails/sync` | Ingest emails |
| `POST` | `/emails/:id/reply` | Generate AI reply |
| `GET` | `/tasks` | List tasks |
| `POST` | `/tasks` | Create a task |
| `PATCH` | `/tasks/:id` | Update a task |
| `GET` | `/calendar/events` | List calendar events |
| `POST` | `/calendar/events` | Create an event |

---

## Notes

- **Microsoft SSO:** Configure real Microsoft Entra ID credentials via the backend environment variables. For local development the auth callback also supports demo query params (`email`, `tenant`, `role`).
- **Queue modes:** Set `QUEUE_INLINE_MODE=true` for simple local dev (no Redis required). Set it to `false` and run `npm run worker` in a separate terminal for the full Redis-backed worker pipeline.
