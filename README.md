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
