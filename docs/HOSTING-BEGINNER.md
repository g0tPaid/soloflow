# SoloFlow hosting for beginners (step by step)

This guide assumes you have **never hosted a website before**.  
Follow the steps in order. Do not skip.

When you finish, SoloFlow will open from any phone with:

```text
https://YOUR-APP.up.railway.app
```

(no PC, no Wi‑Fi to your computer)

---

## What you are building

SoloFlow needs **4 pieces** online:

| Piece | What it does | Like… |
|-------|----------------|--------|
| **Web** | The screens you see | The shop front |
| **API** | Creates invoices, saves data | The workers in the back |
| **Postgres** | Saves customers / invoices forever | Filing cabinets |
| **Redis** | Small helper cache | Sticky notes |

We will put all 4 on **Railway** (one website, one login).

Cost: often a free trial, then roughly **$5–20/month**.

---

## Before you start (15–30 minutes)

### 1) Create a free GitHub account

1. Open https://github.com/signup  
2. Create account  
3. Verify your email  

### 2) Put SoloFlow on GitHub

On your PC:

1. Install GitHub Desktop if you want easy clicks: https://desktop.github.com  
2. Or ask Cursor later: “push SoloFlow to GitHub”  
3. Goal: a repo like `https://github.com/YOURNAME/flowbooks`

Railway / Vercel read from GitHub. Without GitHub, hosting is much harder.

### 3) Create a Railway account

1. Open https://railway.app  
2. Click **Login** → **Login with GitHub**  
3. Approve access  

### 4) Write down passwords (a notepad file)

Create a file on Desktop: `soloflow-hosting-secrets.txt`

You will fill it as you go. Example:

```text
AUTH_SECRET=
JWT_SECRET=
DATABASE_URL=
REDIS_URL=
WEB_URL=
API_URL=
```

Never put this file in GitHub.

---

## STEP 1 — Create a Railway project

1. Open https://railway.app/dashboard  
2. Click **New Project**  
3. Choose **Empty Project**  
4. Rename it to `SoloFlow` (click the name at the top)

You now have an empty box. Next we add the 4 pieces.

---

## STEP 2 — Add Postgres database

1. In the project, click **+ Create** / **Add service**  
2. Choose **Database** → **Add PostgreSQL**  
3. Wait until it shows **Online**  
4. Click the Postgres service → **Variables** (or **Connect**)  
5. Copy **`DATABASE_URL`**  
6. Paste it into your secrets notepad  

Done for database.

---

## STEP 3 — Add Redis

1. Click **+ Create** again  
2. Choose **Database** → **Add Redis**  
3. Wait until **Online**  
4. Copy **`REDIS_URL`** (or `REDIS_PRIVATE_URL` if Railway shows that for same-project services)  
5. Paste into your secrets notepad  

If you only see one Redis URL, use that.

---

## STEP 4 — Deploy the API (backend)

### 4A) Create the service from GitHub

1. Click **+ Create** → **GitHub Repo**  
2. Select your `flowbooks` repository  
3. Railway creates a service (rename it to **`api`**)

### 4B) Tell Railway where the API lives

This repo is a **monorepo** (many apps in one). Settings matter.

Open the **`api`** service → **Settings**:

| Setting | Value |
|---------|--------|
| Root Directory | `apps/api` |
| Watch Paths | leave empty for now |

If build fails because packages are at the repo root, switch Root Directory to `/` (repo root) and set custom build/start (see Troubleshooting).

### 4C) Add environment variables (API)

In **`api`** → **Variables** → add these **one by one**:

```text
NODE_ENV=production
PORT=3001
LOCAL_SINGLE_USER=true
LOCAL_USER_EMAIL=owner@local
LOCAL_USER_NAME=Owner
LOCAL_USER_PASSWORD=soloflow
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
```

Also add (paste your real values):

```text
DATABASE_URL=...paste from Postgres...
REDIS_URL=...paste from Redis...
JWT_SECRET=...make a long random string...
JWT_EXPIRES_IN=7d
```

Generate secrets (PowerShell):

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

Run twice: once for `JWT_SECRET`, once later for `AUTH_SECRET`.

Leave `CORS_ORIGIN` empty for now — you will set it after the web URL exists.

### 4D) Generate a public API URL

1. **`api`** → **Settings** → **Networking** / **Public Networking**  
2. Click **Generate Domain**  
3. Copy URL, example:

```text
https://api-production-xxxx.up.railway.app
```

4. Save as `API_URL` in your notepad  
5. Add variable:

```text
API_URL=https://api-production-xxxx.up.railway.app
```

### 4E) Run database tables (migration)

Your empty Postgres has no invoice tables yet.

Easiest beginner method:

1. On your PC, temporarily set `DATABASE_URL` in `apps/api/.env` to the **Railway** Postgres URL  
2. From project folder run:

```bat
cd C:\Users\user\Projects\flowbooks
pnpm db:generate
pnpm --filter @flowbooks/database exec prisma migrate deploy
```

3. Change `apps/api/.env` back to local when finished (or keep two notepad copies)

If migrate deploy fails, try:

```bat
pnpm --filter @flowbooks/database exec prisma db push
```

(Use `db push` only for getting started; migrate deploy is cleaner later.)

### 4F) Test API health

Open in browser:

```text
https://YOUR-API-URL/api/v1/health
```

If you see OK / healthy JSON → Step 4 is done.  
If 404, try `/api/docs` or check Railway **Deployments** logs.

---

## STEP 5 — Deploy the Web (frontend)

### 5A) Add another GitHub service

1. Same Railway project → **+ Create** → **GitHub Repo** → same `flowbooks` repo  
2. Rename service to **`web`**

### 5B) Settings

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |

(If monorepo build fails, see Troubleshooting and build from repo root.)

### 5C) Public web URL

1. **`web`** → Networking → **Generate Domain**  
2. Copy URL, example:

```text
https://web-production-xxxx.up.railway.app
```

3. Save as `WEB_URL`

### 5D) Web environment variables

In **`web`** → Variables:

```text
NODE_ENV=production
NEXT_PUBLIC_LOCAL_MODE=true
AUTH_URL=https://YOUR-WEB-URL
NEXT_PUBLIC_API_URL=https://YOUR-API-URL/api/v1
DATABASE_URL=...same Postgres URL...
AUTH_SECRET=...another long random string...
```

Important:

- `AUTH_URL` = web URL (no trailing slash)
- `NEXT_PUBLIC_API_URL` must end with `/api/v1`

### 5E) Finish API CORS

Go back to **`api`** variables and set:

```text
CORS_ORIGIN=https://YOUR-WEB-URL
```

Redeploy **api** if Railway does not auto-redeploy.

---

## STEP 6 — First login test (phone + PC)

1. Open your **WEB_URL** on your computer browser  
2. You should land in SoloFlow (local mode skips login)  
3. Create a customer, create an invoice, download PDF  

Then on your **phone**:

1. Turn off Wi‑Fi (use mobile data)  
2. Open the same **WEB_URL**  
3. Confirm Dashboard loads  

If phone works on mobile data → **hosting is success**.

---

## STEP 7 — Point your Android app at the live site

Only after Step 6 works:

1. Double-click Desktop `BUILD-PLAYSTORE-AAB.bat`  
2. Paste your **WEB_URL** (`https://…`)  
3. Build → `SoloFlow-play.aab`  

That AAB is what Play Store wants.

---

## Simple mental model

```text
Phone / Browser
      │
      ▼
 WEB (Railway)  ──talks to──▶  API (Railway)
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
                 Postgres                      Redis
```

---

## Troubleshooting (beginner)

### Build failed on Railway

Open the failed deployment → **View Logs**.

Common causes:

1. **Wrong root directory**  
2. **pnpm monorepo** needs root install  

If Root Directory `apps/api` fails, try:

- Root Directory: `/` (empty / repo root)  
- Custom build command (ask Cursor to add a `Dockerfile` if this happens)  
- Start command: something like `node apps/api/dist/main`

Paste the red error into Cursor and say: “Railway build failed, fix it.”

### Website opens but invoices fail

Usually bad `NEXT_PUBLIC_API_URL` or `CORS_ORIGIN`.

Check:

- API health URL works  
- Web variable points to that exact API  
- CORS matches the web URL exactly (https, no trailing slash mismatch)

### “Database” errors

Migrations were not applied. Repeat Step 4E with the Railway `DATABASE_URL`.

### App works on PC Wi‑Fi old APK only

That is the **old local APK**. Hosted URL is different — open the Railway web URL in Chrome first.

### Redis connection errors

Make sure `REDIS_URL` is from the Redis service in the **same** Railway project.

---

## Optional later upgrades (not required day 1)

- Buy a domain (`soloflow.com`) and point it to Railway  
- Privacy policy page (needed for Play Store)  
- Stronger password instead of `soloflow`  
- Automatic GitHub deploys on every push  

---

## Your checklist (print this)

- [ ] GitHub account + SoloFlow repo uploaded  
- [ ] Railway account linked to GitHub  
- [ ] Postgres added + `DATABASE_URL` copied  
- [ ] Redis added + `REDIS_URL` copied  
- [ ] API service deployed + public domain  
- [ ] Database migrate / db push from PC  
- [ ] Health URL works in browser  
- [ ] Web service deployed + public domain  
- [ ] Web env vars set (`AUTH_URL`, `NEXT_PUBLIC_API_URL`, `AUTH_SECRET`)  
- [ ] API `CORS_ORIGIN` set to web URL  
- [ ] Test on phone with mobile data  
- [ ] Build Play Store AAB with that HTTPS URL  

---

## What you should do right now (next 1 hour)

1. Create GitHub + push this project  
2. Create Railway project  
3. Add Postgres + Redis  
4. Come back and tell me:

```text
I finished Step 2 and 3.
GitHub repo: https://github.com/...
Railway project is ready.
```

Then I will guide you through deploying **API** with your exact repo settings (click by click for the build commands if Railway complains).
