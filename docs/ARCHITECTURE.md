# FlowBooks Architecture

## Overview

FlowBooks is a multi-tenant SaaS accounting platform built as a monorepo with clean separation between frontend, backend, and shared packages.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│                   Next.js 15 + React 19                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     apps/web (Vercel)                        │
│  Auth.js │ TanStack Query │ ShadCN UI │ Framer Motion        │
└────────────┬──────────────────────────────┬───────────────────┘
             │ JWT / Session                │ REST API
             ▼                              ▼
┌────────────────────────┐    ┌─────────────────────────────┐
│   Auth.js Providers    │    │      apps/api (Railway)      │
│  Google, Credentials   │    │  NestJS │ Swagger │ BullMQ   │
└────────────────────────┘    └──────────┬──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  PostgreSQL  │    │    Redis     │    │  S3 Storage  │
            │   (Prisma)   │    │ Cache/Queue  │    │   (Files)    │
            └──────────────┘    └──────────────┘    └──────────────┘
```

## Monorepo Structure

```
flowbooks/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # UI components
│   │   │   ├── lib/         # API client, utils
│   │   │   └── auth.ts      # Auth.js config
│   │   └── vercel.json
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── auth/        # JWT auth module
│       │   ├── organizations/
│       │   ├── customers/
│       │   ├── products/
│       │   ├── invoices/
│       │   ├── dashboard/
│       │   ├── queue/       # BullMQ processors
│       │   ├── redis/       # Cache service
│       │   ├── storage/     # S3 abstraction
│       │   └── common/      # Middleware, decorators
│       └── railway.json
├── packages/
│   ├── shared/              # Shared types & validators
│   └── database/            # Prisma schema & client
└── docker-compose.yml
```

## Multi-Tenancy

### Tenant Model

- **Organization** = tenant/workspace (e.g., "Acme Inc")
- **OrganizationMember** links users to orgs with roles
- All business data includes `organizationId` foreign key

### Tenant Isolation

1. **API Layer:** `x-organization-id` header required on tenant routes
2. **Query Layer:** Every Prisma query filters by `organizationId`
3. **Middleware:** `TenantMiddleware` validates membership before processing
4. **Indexes:** Composite indexes on `(organizationId, ...)` for performance

### Future: Subdomain Routing

```
acme.flowbooks.com → organization slug "acme"
```

## Authentication Flow

```
Register/Login (Web)
    │
    ├─ Credentials → API /auth/login → JWT
    └─ Google → Auth.js OAuth → (future: link to API user)
    
API Requests
    │
    ├─ Authorization: Bearer <jwt>
    └─ x-organization-id: <org-id>
```

## RBAC (Role-Based Access Control)

### Built-in Roles

| Role | Description |
|------|-------------|
| OWNER | Full access, can delete org |
| ADMIN | Full access except org deletion |
| MANAGER | CRUD on customers, products, invoices |
| ACCOUNTANT | Financial operations, reports |
| SALES | Customer & invoice creation |
| EMPLOYEE | Read-only access |
| CUSTOM | Organization-defined permissions |

### Permission System

Permissions are granular strings (e.g., `invoices:create`). Roles map to permission sets in `@flowbooks/shared`. Custom roles store permissions as JSON arrays.

## Feature Flags / Plugin Architecture

```typescript
// Organization-level feature flags
FeatureFlag {
  organizationId, key, enabled, config
}
```

Modules check flags before rendering/enabling features. This allows:
- Gradual rollout per organization
- Plan-based feature gating (future billing)
- Plugin-ready extensibility

## Data Model Highlights

### Core Entities

- **User** — Auth identity (email, password, OAuth accounts)
- **Organization** — Tenant with settings
- **Customer** — Business contacts with custom fields
- **Product** — Catalog items with pricing
- **Invoice** — Billing documents with line items
- **AuditLog** — Immutable action history
- **CustomFieldDefinition** — Extensible metadata per entity type

### Extensibility

`CustomFieldDefinition` allows organizations to add custom fields to any entity without schema changes. Values stored in `customFields` JSON column.

## Queue System (BullMQ)

```
Invoice Reminders Queue
    │
    ├─ due_soon → email notification (Phase 2)
    └─ overdue → escalation email (Phase 2)
```

Redis backs both caching and job queues.

## Storage Abstraction

```typescript
StorageService
    ├─ local (dev) → ./uploads/
    └─ s3 (prod) → AWS S3 / compatible
```

Environment variables control provider selection. No hardcoded paths.

## API Design

- REST with `/api/v1` prefix
- OpenAPI/Swagger at `/api/docs`
- GraphQL-ready module structure (Phase 6)
- Consistent error responses
- Pagination on list endpoints

## Frontend Architecture

- **App Router** with route groups: `(auth)`, `(dashboard)`
- **TanStack Query** for server state
- **React Hook Form + Zod** for forms (shared validators)
- **Framer Motion** for page transitions
- **next-themes** for dark/light mode
- **ShadCN UI** component library with custom design tokens

## Deployment Topology

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  apps/web   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Railway  │ │ Railway  │ │ Railway  │
        │ apps/api │ │ Postgres │ │  Redis   │
        └──────────┘ └──────────┘ └──────────┘
```

## Security Considerations

- Helmet.js for HTTP headers
- CORS restricted to known origins
- JWT with configurable expiry
- Password hashing with bcrypt (12 rounds)
- Input validation via class-validator + Zod
- Tenant isolation enforced at query level
- No secrets in code — all via environment variables

## Testing Strategy

| Layer | Framework | Location |
|-------|-----------|----------|
| API unit | Jest | `apps/api/src/**/*.spec.ts` |
| Web unit | Vitest | `apps/web/src/**/*.test.tsx` |
| Shared | Vitest | `packages/shared/src/**/*.test.ts` |
| E2E | Playwright | Phase 2 |

## Environment Variables

See `.env.example` files in `apps/web` and `apps/api`. Never commit `.env` files.
