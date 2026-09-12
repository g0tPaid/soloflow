# FlowBooks

Modern Accounting & Business Management SaaS — a production-grade monorepo built for multi-tenant accounting, invoicing, and business operations.

## Architecture

```
flowbooks/
├── apps/
│   ├── web/          # Next.js 15 frontend (Vercel)
│   └── api/          # NestJS REST API (Railway)
├── packages/
│   ├── shared/       # Types, Zod validators, constants
│   └── database/     # Prisma schema & client
├── docker-compose.yml
└── docs/
```

**Stack:** Next.js 15 · React 19 · NestJS · PostgreSQL · Prisma · Redis · BullMQ · Auth.js · TanStack Query · ShadCN UI

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL & Redis)

### 1. Clone & Install

```bash
cd C:\Users\user\Projects\flowbooks
pnpm install
```

### 2. Environment Setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

### 4. Database Migration

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Run Development Servers

```bash
pnpm dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:3001
- **Swagger:** http://localhost:3001/api/docs

### Desktop Shortcut

Double-click `START-FLOWBOOKS.bat` on your Desktop to start everything automatically.

### Windows Note

If `pnpm install` fails with `EPERM` on `@prisma/engines`, temporarily disable antivirus real-time scanning for the project folder, then run:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

First install may take 5–10 minutes while Prisma downloads database engines.

## Multi-Tenancy

Every business entity is scoped to an `organizationId`. The API expects the `x-organization-id` header on tenant-scoped routes. Row-level isolation is enforced in all Prisma queries.

## Auth

- **Web:** Auth.js (NextAuth v5) with Credentials + Google provider scaffold
- **API:** JWT bearer tokens
- **Roles:** Owner, Admin, Manager, Accountant, Sales, Employee + custom roles
- **Team:** Owner/Admin invite staff from **Settings → Team**. Each person signs in with their own email and password. Concurrent sessions are supported.

### Invite 5 staff (same organization)

1. Hosted deploy must **not** auto-login a single user. On the API, leave `LOCAL_SINGLE_USER` **false or unset**. On the web, leave `NEXT_PUBLIC_LOCAL_MODE` **false or unset**. Real login at [soloflow.practicalthings.store](https://soloflow.practicalthings.store) requires this.
2. Sign in as the owner → **Team** (or **Company Details → Team**).
3. For each staff member, enter email, name, and role, then **Invite**.
4. If Resend is configured (`RESEND_API_KEY`), they get an email. They open the link, create their own password, and join the same company.
5. If email is not configured, SoloFlow creates their account and shows a **temporary password**. Share email + password with them securely.
6. Each person signs in at `https://soloflow.practicalthings.store` with **their** email/password (any computer). They see the same invoices, customers, and dashboard as the owner (`x-organization-id` + membership).
7. Existing single-owner accounts are unchanged until you invite someone.

Optional: set `RESEND_API_KEY` and `EMAIL_FROM` on the API so invites go out by email. `APP_URL` / `WEB_URL` should be `https://soloflow.practicalthings.store` so invite links are correct.

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Web | Vercel | `apps/web/vercel.json` |
| API | Railway | `apps/api/railway.json` |
| DB | Railway/Neon | `DATABASE_URL` env |
| Redis | Railway/Upstash | `REDIS_URL` env |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web + API in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Roadmap](ROADMAP.md)

## License

Private — All rights reserved.
