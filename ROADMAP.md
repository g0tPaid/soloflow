# FlowBooks Roadmap

Comprehensive feature roadmap organized by implementation phase. **Phase 1** is the current foundation.

---

## Phase 1 — Foundation (Current)

Core platform scaffolding and essential business modules.

- [x] Monorepo with pnpm workspaces
- [x] Multi-tenant architecture (Organization/Workspace model)
- [x] RBAC scaffold (Owner, Admin, Manager, Accountant, Sales, Employee, Custom)
- [x] Auth.js with Google + email credentials
- [x] User registration & login
- [x] Organization onboarding
- [x] Prisma schema (User, Organization, Customer, Product, Invoice, AuditLog, CustomFields)
- [x] NestJS API with Swagger docs
- [x] Tenant middleware (`x-organization-id` header)
- [x] Customers CRUD API
- [x] Products CRUD API
- [x] Invoices CRUD API (with line items)
- [x] Dashboard metrics API
- [x] Redis cache module
- [x] BullMQ queue (invoice reminders placeholder)
- [x] S3-compatible storage abstraction
- [x] Next.js UI shell with sidebar navigation
- [x] Dark/light mode
- [x] Dashboard with metric cards
- [x] Docker Compose (PostgreSQL 16, Redis 7)
- [x] Feature flags / plugin-ready architecture
- [x] Audit log model
- [x] Custom field definitions model
- [ ] Full customer/product/invoice UI pages (list, create, edit)
- [ ] Organization switcher
- [ ] Team member invitations

---

## Phase 2 — Core Accounting

Essential accounting workflows for day-to-day operations.

- [ ] Expense tracking & categorization
- [ ] Expense receipts (upload via S3)
- [ ] Chart of accounts
- [ ] Journal entries (double-entry bookkeeping)
- [ ] Bank account connections (manual import)
- [ ] Bank reconciliation
- [ ] Payment recording on invoices
- [ ] Partial payments
- [ ] Invoice PDF generation
- [ ] Invoice email sending
- [ ] Invoice reminders (BullMQ worker)
- [ ] Recurring invoices
- [ ] Credit notes
- [ ] Tax configuration per organization
- [ ] Multi-currency support
- [ ] Exchange rate management
- [ ] Organization settings UI (branding, currency, tax)
- [ ] Team management UI (invite, roles, permissions)
- [ ] Custom roles UI
- [ ] Audit log viewer

---

## Phase 3 — Advanced Invoicing & Sales

Sales pipeline and advanced billing features.

- [ ] Quotes / Estimates
- [ ] Quote-to-invoice conversion
- [ ] Sales orders
- [ ] Delivery notes
- [ ] Proforma invoices
- [ ] Invoice templates (customizable)
- [ ] Online payment links (Stripe integration)
- [ ] Payment gateway abstraction
- [ ] Subscription billing
- [ ] Dunning management
- [ ] Customer portal (view/pay invoices)
- [ ] Sales pipeline / CRM basics
- [ ] Lead management
- [ ] Contact management
- [ ] Activity timeline per customer

---

## Phase 4 — Inventory & Operations

Inventory, projects, and operational modules.

- [ ] Inventory management
- [ ] Stock levels & adjustments
- [ ] Purchase orders
- [ ] Vendor/supplier management
- [ ] Bill management (accounts payable)
- [ ] Project management
- [ ] Time tracking
- [ ] Project-based invoicing
- [ ] Billable hours
- [ ] Expense approval workflows
- [ ] Purchase approval workflows
- [ ] Barcode/SKU scanning
- [ ] Warehouse locations
- [ ] Low stock alerts

---

## Phase 5 — Reporting & Analytics

Business intelligence and compliance reporting.

- [ ] Profit & Loss statement
- [ ] Balance sheet
- [ ] Cash flow statement
- [ ] Accounts receivable aging
- [ ] Accounts payable aging
- [ ] Sales reports
- [ ] Tax reports (VAT/GST)
- [ ] Custom report builder
- [ ] Report scheduling & email delivery
- [ ] Data export (CSV, Excel, PDF)
- [ ] Dashboard widgets (customizable)
- [ ] KPI tracking
- [ ] Budget vs actual
- [ ] Financial year close

---

## Phase 6 — Enterprise & Platform

Scale, integrations, and platform features.

- [ ] Payroll module
- [ ] Employee management
- [ ] Apple Sign-In
- [ ] Microsoft Sign-In
- [ ] OTP / magic link auth
- [ ] Passkeys (WebAuthn)
- [ ] SSO (SAML/OIDC)
- [ ] API keys for third-party access
- [ ] Webhooks
- [ ] GraphQL API layer
- [ ] Zapier/Make integrations
- [ ] QuickBooks/Xero import
- [ ] Multi-organization per user (switcher)
- [ ] White-label / reseller mode
- [ ] Custom domain per organization
- [ ] Subdomain routing (`acme.flowbooks.com`)
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Advanced search (full-text)
- [ ] AI assistant (invoice categorization, insights)
- [ ] Compliance (GDPR data export/delete)
- [ ] SOC 2 readiness
- [ ] Rate limiting & API quotas
- [ ] Billing & subscription plans (SaaS monetization)

---

## Auth Providers Roadmap

| Provider | Status |
|----------|--------|
| Email/Password | ✅ Implemented |
| Google | 🔧 Scaffolded |
| Apple | 📋 Phase 6 |
| Microsoft | 📋 Phase 6 |
| OTP/Magic Link | 📋 Phase 6 |
| Passkeys | 📋 Phase 6 |
| SAML/OIDC SSO | 📋 Phase 6 |

---

## Infrastructure Roadmap

| Component | Status |
|-----------|--------|
| Docker Compose (dev) | ✅ |
| Vercel (web) | ✅ Config ready |
| Railway (API) | ✅ Config ready |
| PostgreSQL | ✅ |
| Redis | ✅ |
| BullMQ | ✅ Scaffold |
| S3 Storage | 🔧 Abstraction ready |
| CI/CD (GitHub Actions) | 📋 Phase 2 |
| Monitoring (Sentry) | 📋 Phase 2 |
| Email (Resend/SendGrid) | 📋 Phase 2 |
