# Practical Things storefront (Railway)

Deploy as a **new Railway service** from this monorepo.

## Quick setup

1. Railway → **New** → **GitHub Repo** → `g0tPaid/soloflow`
2. Service name: `storefront` (or `practical-things`)
3. **Settings → Root Directory:** `apps/storefront`
4. **Variables:**
   - `NEXT_PUBLIC_SITE_URL` = `https://www.practicalthings.store` (or your Railway URL first)
   - `PORT` = `3000` (Railway sets this automatically)
5. **Networking → Generate Domain** (e.g. `storefront-production-xxxx.up.railway.app`)
6. Optional custom domain: `www.practicalthings.store` → CNAME to Railway

## Local

```bash
pnpm dev:storefront
```

Open http://localhost:3002

## Build (CI / local)

```bash
pnpm --filter @practical-things/storefront build
pnpm --filter @practical-things/storefront start
```

Uses Next.js `standalone` output for a small production bundle.
