# GoCreate OS v6.2

One canonical source tree for the GoCreate front-desk kiosk, admin operations UI, Firebase cloud data, Windows edge/core services, GoCreate portal synchronization, reports, analytics, scheduling, audit logs, and Vercel deployment.

## Architecture

- **Vercel / Next.js**: admin UI, kiosk UI, API routes, reports and analytics.
- **Firebase Firestore**: durable people, badges, attendance, guests, schedules, availability, settings, audit and operational records.
- **Firebase Realtime Database**: low-volume live kiosk heartbeats and commands between cloud and the Windows core.
- **Windows core**: portal scraper, automatic checkout worker, command worker, kiosk watchdog and LAN host.
- **SQLite recovery**: the old database is never modified by the migration script; supported tables are imported into Firestore.

## Windows installation

```powershell
cd C:\GoCreate\GoCreateOS
Set-ExecutionPolicy -Scope Process Bypass -Force
.\windows\install.ps1
.\windows\configure-v6.2.ps1 -ServiceAccountPath "C:\path\service-account.json" -GoCreateEmail "your@email" -SuperAdminEmails "admin@email"
.\windows\build.ps1
.\windows\start.ps1
```

For unattended front-desk operation, run PowerShell as Administrator and then:

```powershell
.\windows\configure-lan.ps1
.\windows\configure-kiosk.ps1 -Browser Chrome
.\windows\configure-auto-logon.ps1
```

## Recover the existing SQLite data

Keep the original recovery file outside the source checkout. After configuring Firebase:

```powershell
npm run migrate:sqlite -- "C:\GoCreateRecovery\gocreate-v6-RECOVERY.sqlite"
```

The importer opens SQLite read-only, discovers its tables, imports recognized v5/v6 tables in batches, and records a migration marker in Firestore.

## GitHub → Vercel

Push this entire repository to GitHub and import the repository into Vercel. Do **not** build a separate Vercel-only folder. In Vercel set `GOCREATE_DEPLOYMENT_MODE=cloud`, Firebase project/database values, `GOCREATE_SESSION_SECRET`, and either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64`.

The Windows machine and Vercel then use the same Firebase data. The Windows core remains responsible for scraping `https://portal.gocreate.com/` because browser automation is not a good Vercel workload.

## Health

- Next/API: `/api/health`
- Windows sync service: `http://127.0.0.1:8000/health`

## Important

The portal scraper uses resilient generic table/login selectors, but GoCreate's portal is external software. If its HTML changes, update `services/sync/run.py`; the rest of GoCreate OS remains independent of that scraper.
