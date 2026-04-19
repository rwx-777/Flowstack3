<div align="center">

# ⬡ Flowstack3

**Intelligent workflow automation for professional service firms**

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com/)

---

A cloud-ready, multi-tenant SaaS platform built for **law firms** and **insurance companies**.  
Automate emails, tasks, calendars, and workflows — all behind enterprise-grade Microsoft SSO.

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 Authentication & Security
- **Microsoft Entra ID (Azure AD) SSO** — one-click enterprise login
- **JWT-based API auth** with shared secret between frontend & backend
- **RBAC** with Admin / Write / Read roles and granular permissions
- **AES-256-GCM** encrypted email storage

</td>
<td width="50%">

### 📧 Email & AI
- **Outlook email sync** via Microsoft Graph API
- **AI-powered reply drafting** with intent parsing
- **Encrypted at rest** — message bodies stored with AES-256-GCM
- **Task auto-creation** from detected email intents

</td>
</tr>
<tr>
<td width="50%">

### 📅 Calendar & Tasks
- **Outlook calendar sync** — bi-directional via Graph API
- **Event management** with attendees and reminders
- **Task board** with assignment, due dates, and status tracking
- **RBAC-gated** — users see only what their role permits

</td>
<td width="50%">

### ⚡ Workflows & Execution
- **Visual workflow engine** with triggers and node graphs
- **Execution history** with duration, status, and error tracking
- **BullMQ job queue** backed by Redis for async processing
- **Inline mode** available for simple local dev (no Redis needed)

</td>
</tr>
<tr>
<td width="50%">

### 🌍 Internationalization
- **German & English** out of the box via `next-intl`
- Locale-aware date, time, and number formatting
- Easily extensible to additional languages

</td>
<td width="50%">

### 🎨 Design System
- **Verodyn design tokens** — HSL-based theming in CSS
- **Plus Jakarta Sans** typography
- **Dark mode** with class-based toggling
- Consistent 12px border-radius, border-based elevation

</td>
</tr>
</table>

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Compose                            │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────┐  ┌──────────┐ │
│  │   Frontend    │   │   Backend    │   │ Postgres │  │  Redis   │ │
│  │  Next.js 15   │──▶│  Express 5   │──▶│   16     │  │    7     │ │
│  │  React 19     │   │  Prisma ORM  │   │          │  │          │ │
│  │  Tailwind CSS │   │  BullMQ      │   │          │  │          │ │
│  │  NextAuth v4  │   │  Zod         │   │          │  │          │ │
│  │  :3000        │   │  :4000       │   │  :5432   │  │  :6379   │ │
│  └──────────────┘   └──────┬───────┘   └──────────┘  └────┬─────┘ │
│                            │                               │       │
│                      ┌─────▼─────┐                         │       │
│                      │  Worker   │◀────────────────────────┘       │
│                      │  BullMQ   │                                 │
│                      └───────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Microsoft Graph  │
                    │  (Outlook, Azure) │
                    └───────────────────┘
```

### Repository Layout

```
flowstack3/
├── frontend/             → Next.js 15 App Router dashboard
│   └── src/
│       ├── app/          → Pages & API routes
│       ├── components/   → UI components (Verodyn design system)
│       ├── features/     → Feature modules (calendar, workflows, tasks…)
│       ├── lib/          → Utilities, RBAC, validation
│       ├── server/       → Server-side services
│       └── i18n/         → Translations (DE / EN)
├── backend/              → Express 5 REST API
│   ├── src/
│   │   ├── routes/       → Auth, emails, tasks, calendar, workflows…
│   │   ├── services/     → Microsoft Graph, encryption, queue
│   │   ├── middleware/   → JWT auth, rate limiting
│   │   └── workers/      → BullMQ job processors
│   ├── prisma/           → Schema & migrations
│   └── tests/            → Vitest test suites
├── docker-compose.yml    → Full-stack local environment
└── .github/workflows/    → CI pipeline (lint → test → build)
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 22+ | Runtime for both services |
| **npm** | 10+ | Ships with Node.js |
| **PostgreSQL** | 16+ | Or use Docker Compose |
| **Redis** | 7+ | Or use Docker Compose |
| **Docker** | Latest | Optional — for the one-command setup |

---

### ⚡ Quick Start with Docker

The fastest way to get running. One command spins up everything:

```bash
docker compose up --build
```

That's it! Once the containers are healthy:

| Service | URL |
|---------|-----|
| 🖥 Frontend | [http://localhost:3000](http://localhost:3000) |
| 🔌 Backend API | [http://localhost:4000](http://localhost:4000) |
| 🐘 PostgreSQL | `localhost:5432` |
| 📮 Redis | `localhost:6379` |

<details>
<summary><strong>Docker cheat sheet</strong></summary>

```bash
# Start (no rebuild):
docker compose up

# Rebuild after code/dependency changes:
docker compose up --build

# Stop all services:
docker compose down

# Stop and wipe database data:
docker compose down -v
```

</details>

---

### 🛠 Manual Setup

For full control over each service, run them directly on your machine.

<details>
<summary><strong>1 · Backend</strong></summary>

```bash
cd backend

# Environment
cp .env.example .env
# ✏️  Edit .env — see "Environment Variables" below

# Install & generate
npm ci
npm run prisma:generate
npm run prisma:migrate

# Verify
npm run lint && npm run test && npm run build

# Run
npm run dev          # → http://localhost:4000
```

</details>

<details>
<summary><strong>2 · Frontend</strong></summary>

```bash
cd frontend

# Install
npm ci

# Verify
npm run lint && npm run build

# Run
npm run dev          # → http://localhost:3000
```

</details>

<details>
<summary><strong>Day-to-day development</strong></summary>

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

> **When to re-run setup commands:**
> - `npm ci` → after `package-lock.json` changes
> - `npm run prisma:migrate` → after new migration files
> - `npm run prisma:generate` → after Prisma schema changes

</details>

---

## ⚙️ Environment Variables

Copy the example and customize:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | `postgresql://…@db:5432/flowstack3` | Postgres connection string¹ |
| `JWT_SECRET` | — | JWT signing secret (≥ 32 chars) |
| `ENCRYPTION_KEY` | — | AES-256-GCM key (≥ 32 chars) |
| `MICROSOFT_CLIENT_ID` | — | Entra ID app client ID |
| `MICROSOFT_CLIENT_SECRET` | — | Entra ID app client secret |
| `MICROSOFT_TENANT_ID` | `common` | Entra tenant ID |
| `MICROSOFT_REDIRECT_URI` | `http://localhost:4000/auth/callback` | OAuth redirect URI |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string¹ |
| `QUEUE_INLINE_MODE` | `true` | `true` = no Redis needed, `false` = BullMQ worker |

> ¹ **Local dev tip:** Replace `db` / `redis` hostnames with `localhost` when running without Docker.

---

## 📜 Available Scripts

### Backend — `cd backend`

| Command | Description |
|:--------|:------------|
| `npm run dev` | Hot-reload dev server (`tsx watch`) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Run compiled server |
| `npm run worker` | Start BullMQ worker process |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm run test` | Run Vitest test suite |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |

### Frontend — `cd frontend`

| Command | Description |
|:--------|:------------|
| `npm run dev` | Next.js dev server with hot-reload |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## 📡 API Reference

All routes except `/auth/*` require a valid JWT in the `Authorization` header.

### Authentication

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/auth/login` | Redirect to Microsoft SSO |
| `GET` | `/auth/callback` | OAuth callback handler |
| `GET` | `/auth/logout` | End session |

### Emails

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/emails` | List emails for the current user |
| `POST` | `/emails/sync` | Sync inbox from Outlook |
| `POST` | `/emails/:id/reply` | Generate AI-drafted reply |

### Tasks

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/tasks` | List tasks |
| `POST` | `/tasks` | Create a task |
| `PATCH` | `/tasks/:id` | Update a task |

### Calendar

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/calendar/events` | List calendar events |
| `POST` | `/calendar/events` | Create an event |
| `POST` | `/calendar/sync` | Sync from Outlook calendar |

---

## 🔒 Role-Based Access Control

Flowstack3 uses a three-tier role model with granular permissions:

| Capability | Admin | Write | Read |
|:-----------|:-----:|:-----:|:----:|
| View workflows & executions | ✅ | ✅ | ✅ |
| Execute workflows | ✅ | ✅ | — |
| Upload / delete workflows | ✅ | — | — |
| Read / write tasks | ✅ | ✅ | 👁 |
| Calendar read / write | ✅ | ✅ | 👁 |
| Settings | ✅ | 👁 | 👁 |
| Manage tenant & users | ✅ | — | — |

> 👁 = read-only access

---

## 🗄 Data Model

The database is tenant-scoped with cascading deletes. Key models:

| Model | Purpose |
|:------|:--------|
| **Tenant** | Organization / firm — all data is scoped here |
| **User** | Team member with role + Microsoft Graph tokens |
| **Email** | Ingested emails with encrypted body + AI response |
| **Task** | Assignable tasks with status tracking |
| **Event** | Calendar events with attendees & reminders |
| **Workflow** | Automation definition with trigger type & node graph |
| **WorkflowExecution** | Run history with timing & error data |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch — `git checkout -b feat/amazing-feature`
3. **Commit** your changes — `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch — `git push origin feat/amazing-feature`
5. **Open** a Pull Request

Please ensure `npm run lint` and `npm run test` pass before submitting.

---

## 📄 License

This project is proprietary. All rights reserved.

---

<div align="center">

**Built with ❤️ for professional service firms**

</div>
