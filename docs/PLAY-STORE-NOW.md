# SoloFlow → Play Store (your checklist)

Hosting is live at:

**https://web-production-8e8c3.up.railway.app**

Privacy policy (for Play Console):

**https://web-production-8e8c3.up.railway.app/privacy**

---

## Part A — Build the Play Store file on your PC (today)

### 1. Copy the builder to your Desktop

Double-click:

`C:\Users\user\Projects\flowbooks\scripts\COPY-PLAYSTORE-BAT-TO-DESKTOP.bat`

### 2. Open Android Studio once (if you never have)

- Open **Android Studio**
- Let it finish downloading SDK / Gradle (can take 10–20 minutes on slow internet)
- Close it

### 3. Run the Play Store builder

Double-click **`BUILD-PLAYSTORE-AAB.bat`** on your Desktop.

- When asked for URL, press **Enter** to accept the default Railway URL  
  (`https://web-production-8e8c3.up.railway.app`)
- **First time only:** it will create a **keystore** (signing key)
  - Write down **both passwords** somewhere safe
  - Back up the file:  
    `C:\Users\user\Projects\flowbooks\apps\web\android-keys\soloflow-upload.jks`  
  - **If you lose this file, you cannot update the app on Play Store**

### 4. When it succeeds

You get on your Desktop:

| File | Use |
|------|-----|
| `SoloFlow-play.aab` | Upload to Google Play |
| `SoloFlow-release.apk` | Optional: install on your phone to test before Play review |

### 5. Test the APK on your phone (recommended)

1. Copy `SoloFlow-release.apk` to your phone (USB, Google Drive, etc.)
2. Install it (allow “Install unknown apps” if asked)
3. Turn **VPN off**
4. Use **mobile data** (not PC Wi‑Fi)
5. Open SoloFlow → register/login → create invoice

If that works, you are ready for Play Console.

---

## Part B — Google Play Console ($25 one-time)

### 1. Create developer account

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay **$25** registration (one-time)
3. Complete identity verification (can take hours to a few days)

### 2. Create the app

1. **Create app**
   - Name: **SoloFlow**
   - App: **App**
   - Free
2. Complete dashboard tasks (Play will show a checklist)

### 3. Store listing (copy/paste)

**Short description** (80 chars max):

```
Invoices, expenses & receipts for your small business — clean and fast.
```

**Full description:**

```
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

**Privacy policy URL:**

```
https://web-production-8e8c3.up.railway.app/privacy
```

### 4. Graphics you need

| Asset | Size | Tip |
|-------|------|-----|
| App icon | 512 × 512 PNG | Export your red “SF” logo |
| Feature graphic | 1024 × 500 | Banner with app name |
| Phone screenshots | At least 2 | Screenshot Dashboard + Invoice on your phone |

### 5. Data safety (typical answers)

- Collects: name, email, business data, invoice/customer info you enter
- Purpose: App functionality
- Shared with third parties: **No**
- Encrypted in transit: **Yes** (HTTPS)
- Users can request deletion: **Yes** (email you)

### 6. Upload and test

1. **Test and release** → **Internal testing**
2. Create a tester list (your Gmail)
3. Upload **`SoloFlow-play.aab`** from your Desktop
4. Roll out internal test
5. Open the test link on your phone and install from Play Store
6. When happy → **Production** → upload same AAB → submit for review

First review often takes **1–7 days**.

---

## Part C — Every future update

1. Deploy web changes to Railway (as you do now)
2. Bump version in `VERSION` file in the repo
3. Bump `versionCode` in `apps/web/android/app/build.gradle` (2, 3, 4…)
4. Run **`BUILD-PLAYSTORE-AAB.bat`** again
5. Upload new AAB in Play Console → Production

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Gradle download timeout | Open Android Studio once, wait for setup, retry |
| White screen in app | Railway web service down or wrong URL in build |
| Login/API errors | Check `API_URL` on Railway web service |
| Play rejects upload | Use `.aab` not debug APK |
| Lost keystore | Cannot update same app — must create new listing |

Full reference: `docs/PLAY-STORE.md`
