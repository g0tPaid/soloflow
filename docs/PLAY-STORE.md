# SoloFlow → Google Play Store (complete workflow)

Your phone APK today only works when **START-SOLOFLOW.bat** is running on your PC (same Wi‑Fi).  
Play Store apps must work **anywhere**, so you need:

1. **A public server** (web + API + database on the internet)
2. **A signed release app** (`.aab` for Play Store)
3. **A Google Play Developer account**
4. **Store listing** (icon, screenshots, description, privacy policy)

Follow the steps in order.

---

## Architecture (what you are publishing)

```
Phone (SoloFlow app)
        │
        ▼  HTTPS
https://your-domain.com   ← Next.js web (port 3000 equivalent)
        │
        ▼
https://your-domain.com/api  OR  https://api.your-domain.com
        │
        ▼
PostgreSQL (hosted)
```

The Android app is a Capacitor shell that opens your **live website URL**.  
All invoice / expenses / receipts features stay on the server — same as the web version.

---

## Phase 0 — Checklist before you start

| Item | Why |
|------|-----|
| Android Studio installed | Build signed AAB |
| Google account | Play Console |
| ~$25 USD (one-time) | Play Developer registration |
| Domain name (recommended) | Professional HTTPS URL |
| Hosting budget (~$5–20/mo) | Keep SoloFlow online 24/7 |
| Privacy policy URL | Play Store requirement |
| App icon 512×512 PNG | Store listing |
| Feature graphic 1024×500 | Store listing |
| Phone screenshots (at least 2) | Store listing |

---

## Phase 1 — Host SoloFlow on the internet

Pick **one** hosting path. Recommended for you: **Railway** or a **VPS**.

### Option A — Railway (easiest)

1. Create account at [railway.app](https://railway.app)
2. New project → add **PostgreSQL**
3. Deploy **API** (`apps/api`) as a service  
   - Set env: `DATABASE_URL` (from Railway Postgres), `PORT`, CORS origins
4. Deploy **Web** (`apps/web`) as a service  
   - Set env (examples):

```env
AUTH_SECRET=<long-random-string>
AUTH_URL=https://YOUR-WEB-URL
NEXT_PUBLIC_API_URL=https://YOUR-API-URL/api/v1
NEXT_PUBLIC_LOCAL_MODE=true
DATABASE_URL=<same-postgres-url>
```

5. Run Prisma migrate on the API service once:

```bash
pnpm --filter @flowbooks/database exec prisma migrate deploy
```

6. Open the web URL in a browser and confirm login + invoices work.

### Option B — VPS (DigitalOcean / Contabo / Hetzner)

1. Create Ubuntu 22.04 droplet
2. Install Docker + Docker Compose (or Node + Postgres)
3. Point your domain DNS to the VPS
4. Put Nginx / Caddy in front with HTTPS (Let's Encrypt)
5. Run web on 3000, API on 3001, Postgres internally
6. Set the same env vars as above with your public HTTPS URLs

### Critical production settings

- Use **HTTPS only** (`https://…`)
- Set `AUTH_URL` to the public web URL
- Set `NEXT_PUBLIC_API_URL` to the public API URL
- Turn off cleartext HTTP in the app (see Phase 2)
- Back up your Postgres regularly

When this works in Chrome on your phone (cellular data, not PC Wi‑Fi), hosting is ready.

---

## Phase 2 — Point the Android app at production

Build script: **`BUILD-PLAYSTORE-AAB.bat`** on your Desktop (or `scripts/BUILD-PLAYSTORE-AAB.bat` in the repo).

It will:

1. Ask for your **production HTTPS URL** (example: `https://soloflow.yourdomain.com`)
2. Set `CAPACITOR_SERVER_URL` to that URL
3. Sync Capacitor Android project
4. Build a **signed release AAB**

### First-time Android project

If `apps/web/android` does not exist yet:

1. Install [Android Studio](https://developer.android.com/studio)
2. Open it once and finish SDK setup
3. Run `BUILD-SOLOFLOW-APK.bat` once (local debug) **or** run:

```bat
cd C:\Users\user\Projects\flowbooks\apps\web
npx cap add android
```

### Create your Play signing keystore (once forever)

```bat
cd C:\Users\user\Projects\flowbooks\apps\web
mkdir android-keys
keytool -genkey -v -keystore android-keys\soloflow-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias soloflow
```

Remember:

- Keystore password
- Key alias (`soloflow`)
- Key password

**Back this file up offline.** If you lose it, you cannot update the same Play Store app.

Create `apps/web/android/keystore.properties` (do **not** commit to git):

```properties
storeFile=../android-keys/soloflow-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=soloflow
keyPassword=YOUR_KEY_PASSWORD
```

Wire signing into `android/app/build.gradle` (the playstore build script prints exact lines if missing).

### Build the Play Store package

Double-click **`BUILD-PLAYSTORE-AAB.bat`**, enter:

```text
https://YOUR-PRODUCTION-URL
```

Output file (typical):

```text
Desktop\SoloFlow-play.aab
```

Also keep a release APK for direct install testing if needed.

---

## Phase 3 — Google Play Console account

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay the one-time **$25** registration fee
3. Complete identity verification (can take hours–days)
4. Accept developer agreements

---

## Phase 4 — Create the app in Play Console

1. **Create app**
   - App name: `SoloFlow` (or your brand name)
   - Default language: English (or Malayalam / your market)
   - App or game: **App**
   - Free / Paid: **Free**
2. Complete the **Dashboard checklist**:
   - App access
   - Ads declaration (likely **No ads**)
   - Content rating questionnaire
   - Target audience
   - News app? No
   - Data safety form (see Phase 5)
   - Privacy policy URL

### Store listing fields (copy/paste starter)

**Short description** (80 chars max):

```text
Invoices, expenses & receipts for your small business — clean and fast.
```

**Full description**:

```text
SoloFlow helps you create professional invoices, track expenses and profit per sale, and send payment receipts to customers.

Features:
• Create and edit invoices with shipping details
• Download PDF invoices
• Share invoices on WhatsApp
• Track costs and profit per invoice
• Download receipts for paid invoices
• Dashboard overview of revenue and expenses

Built for solo traders and small businesses.
```

### Graphics

| Asset | Size |
|-------|------|
| App icon | 512 × 512 PNG |
| Feature graphic | 1024 × 500 JPG/PNG |
| Phone screenshots | at least 2 (1080×1920 recommended) |

Tip: open SoloFlow on your phone → take screenshots of Dashboard, Invoice, Expenses.

---

## Phase 5 — Privacy policy & Data safety

Play Store rejects apps without a privacy policy URL.

### Minimum approach

1. Create a simple page, e.g. `https://YOUR-DOMAIN/privacy`
2. State that you store:
   - Account / session data
   - Invoices, customers, products
   - Business details you entered
3. State that data is stored on your server, not sold to third parties
4. Include contact email

### Data safety form (typical for SoloFlow)

- Collects: personal info (name, email, phone of customers you type in), financial info (invoice amounts)
- Purpose: App functionality
- Shared? **No** (unless you use analytics — then declare it)
- Encrypted in transit: **Yes** (HTTPS)
- Users can request deletion: yes (you handle manually by email for now)

---

## Phase 6 — Upload the AAB and release

1. Play Console → your app → **Test and release**
2. Start with **Internal testing** (recommended first)
   - Create email list (your Gmail)
   - Upload `SoloFlow-play.aab`
   - Review → Roll out internal test
3. Install from the internal testing link on your phone
4. Verify on **mobile data** (not PC Wi‑Fi):
   - Dashboard loads
   - Create invoice
   - Download PDF
   - WhatsApp share
   - Expenses + receipts
5. Promote to **Closed testing** or **Production** when ready

### Production rollout

1. Create production release
2. Upload same (or newer) AAB
3. Release notes example:

```text
Initial release of SoloFlow — invoices, expenses, receipts, and WhatsApp sharing.
```

4. Submit for review (often 1–7 days for first app)

---

## Phase 7 — After approval (keep it alive)

| Task | Frequency |
|------|-----------|
| Keep hosting paid / running | Always |
| Postgres backups | Weekly |
| Bump `versionCode` + `versionName` when shipping updates | Every Play update |
| Rebuild AAB with `BUILD-PLAYSTORE-AAB.bat` | Every update |
| Upload new AAB to Production | Every update |

### Versioning rule (Android)

In `android/app/build.gradle`:

- `versionCode` — integer, **must increase** every upload (1, 2, 3…)
- `versionName` — user-facing string (`"0.4.0"`, `"0.5.0"`)

Match `VERSION` file in the repo when you can.

---

## Common failures & fixes

| Problem | Fix |
|---------|-----|
| App opens blank / white screen | Production URL wrong; HTTPS certificate issue; server down |
| Login / API errors | `NEXT_PUBLIC_API_URL` / CORS / `AUTH_URL` mismatch |
| Works on Wi‑Fi PC only | You still pointed the APK at `http://192.168.x.x` — rebuild with public HTTPS |
| Play rejects unsigned / debug APK | Upload **AAB** signed with your upload keystore |
| Lost keystore | Cannot update app — must create a **new** app listing |
| "Data safety" rejection | Fix privacy policy + declarations |
| Mixed content blocked | Use HTTPS for Capacitor `server.url`, not `http://` |

---

## What NOT to upload

- Debug APK from `BUILD-SOLOFLOW-APK.bat` (Wi‑Fi/PC only) → fine for personal install, **not** for Play Store
- Keystore passwords in GitHub / Discord
- Local `.env` secrets

---

## Fast personal path vs Play Store path

| Goal | Use |
|------|-----|
| Use on my phone at home | `BUILD-SOLOFLOW-APK.bat` + `START-SOLOFLOW.bat` |
| Put on Play Store for me (and later others) | Host online → `BUILD-PLAYSTORE-AAB.bat` → Play Console |

---

## Suggested order this week

1. Host SoloFlow publicly and test on phone browser with mobile data  
2. Create keystore + run `BUILD-PLAYSTORE-AAB.bat`  
3. Register Play Console ($25)  
4. Internal test track → install and verify  
5. Fill store listing + privacy policy  
6. Submit production release  

When Phase 1 (hosting URL) is ready, run the AAB script and we can tighten Android signing / icons next if anything fails.
