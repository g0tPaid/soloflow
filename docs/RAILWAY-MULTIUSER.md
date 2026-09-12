# Railway: multi-user SoloFlow (owner + staff)

Live target: **https://soloflow.practicalthings.store/dashboard**

Ajmal (owner) and staff use the **same company data at the same time**, each from their own computer, each with their **own email and password**.

This is the production checklist. Desktop single-user mode (`START-SOLOFLOW.bat`) is separate and must stay off on Railway.

Related: [Hosting for beginners](./HOSTING-BEGINNER.md) · team invites in the [README](../README.md#invite-5-staff-same-organization).

---

## Why local mode must be off

| Variable | If `true` on Railway | What happens |
|----------|----------------------|--------------|
| `LOCAL_SINGLE_USER` | API exposes `POST /auth/bootstrap` | One shared “owner@local” account |
| `NEXT_PUBLIC_LOCAL_MODE` | Web skips the login screen | Everyone is auto-signed in as that one user |

After this merge, **production (`NODE_ENV=production`) ignores those flags** even if they are still `true`. Still **remove them** so a future non-production build cannot turn them back on, and so the Railway dashboard matches reality.

---

## Services (same Railway project)

| Service | Root directory | Config | Required? |
|---------|----------------|--------|-----------|
| **Postgres** | — | Railway plugin | Yes |
| **Redis** | — | Railway plugin | Yes (API cache; queues optional) |
| **api** | `apps/api` | `apps/api/railway.json` + `nixpacks.toml` | Yes |
| **web** | `apps/web` | `apps/web/railway.json` + `nixpacks.toml` | Yes |

API start already runs `prisma migrate deploy` (then `PrismaService` also creates missing tables on boot, including `organization_invites`).

Custom domain on **web**: `soloflow.practicalthings.store` → `/dashboard`.

---

## Exact env changes after merge

Do this on the **already-running** Railway project, then **redeploy both** `api` and `web`.  
`NEXT_PUBLIC_*` is baked in at **build** time — changing it without a web rebuild has no effect.

### API (`api` service) — SET

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (or Railway’s `PORT` if it injects one — keep Railway’s) |
| `DATABASE_URL` | From the Postgres service (reference variable) |
| `REDIS_URL` | From the Redis service (or `REDIS_PRIVATE_URL`) |
| `JWT_SECRET` | Long random string (keep the existing one if already set) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://soloflow.practicalthings.store` |
| `APP_URL` | `https://soloflow.practicalthings.store` |
| `WEB_URL` | `https://soloflow.practicalthings.store` |
| `API_URL` | Public API origin, e.g. `https://api-production-xxxx.up.railway.app` (no `/api/v1`) |
| `STORAGE_PROVIDER` | `local` (unless you already use S3) |
| `LOCAL_SINGLE_USER` | `false` |

Optional (invite / reset emails):

| Variable | Value |
|----------|--------|
| `RESEND_API_KEY` | `re_…` |
| `EMAIL_FROM` | `SoloFlow <noreply@yourdomain.com>` |
| `ORG_MEMBER_SOFT_LIMIT` | `50` (optional; minimum 25) |

If the Railway web URL is still used as well as the custom domain, set:

```text
CORS_ORIGIN=https://soloflow.practicalthings.store,https://YOUR-WEB.up.railway.app
```

(no spaces, or spaces are trimmed)

### API (`api` service) — REMOVE / UNSET

Delete these if they exist (they are desktop-only):

```text
LOCAL_USER_EMAIL
LOCAL_USER_NAME
LOCAL_USER_PASSWORD
```

If `LOCAL_SINGLE_USER` is `true`, change it to `false` or delete it.

### Web (`web` service) — SET

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `AUTH_SECRET` | Long random string (keep existing if set) |
| `AUTH_URL` | `https://soloflow.practicalthings.store` |
| `API_URL` | Same public API origin as the API service (no `/api/v1`) |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.up.railway.app/api/v1` |
| `DATABASE_URL` | Same Postgres URL as the API (Auth.js / build) |
| `NEXT_PUBLIC_LOCAL_MODE` | `false` |

### Web (`web` service) — REMOVE / UNSET

```text
NEXT_PUBLIC_LOCAL_MODE=true
```

Prefer deleting `NEXT_PUBLIC_LOCAL_MODE` entirely, or set `false`. Never leave it `true` on Railway.

---

## After variables are saved

1. Redeploy **api** (so CORS / `APP_URL` / local-mode take effect).
2. Redeploy **web** (required so `NEXT_PUBLIC_LOCAL_MODE=false` is compiled in).
3. Open https://soloflow.practicalthings.store — you must see **Sign in**, not an auto-login.
4. Owner (Ajmal) signs in with his email/password → **Dashboard**.
5. **Team** → invite each staff member (email, name, role). Need at least 5 seats; limit is 50.
6. Each staff member signs in at https://soloflow.practicalthings.store with **their** email/password, from their own computer.
7. Confirm they see the **same** invoices / customers / dashboard.

If Resend is not configured, the Team page shows a **temporary password** after invite — share it securely. They can use Forgot password later.

---

## Overlap with PR #16 (concurrent devices)

[PR #16](https://github.com/g0tPaid/soloflow/pull/16) (`Allow concurrent SoloFlow logins on multiple devices`) adds **refresh tokens** so a network blip does not drop the API JWT.

This work does **not** merge that model (it would conflict with the invite/register session path). Current behavior:

- Email/password JWTs already allow **multiple devices at once** (no single-session lockout).
- This branch keeps the useful hardening from #16: a transient `/auth/me` failure does **not** wipe the access token (so computer A stays signed in when computer B is also using SoloFlow).
- Leave PR #16 open for the refresh-token follow-up; do not stack both session designs in one deploy.

---

## Quick verify (operator)

```text
https://YOUR-API/api/v1/health     → healthy JSON
https://soloflow.practicalthings.store/login
https://soloflow.practicalthings.store/dashboard   (after sign-in)
https://soloflow.practicalthings.store/settings/team
```

API logs in production may print that `LOCAL_SINGLE_USER=true` is ignored. That is expected until you delete the variable.
