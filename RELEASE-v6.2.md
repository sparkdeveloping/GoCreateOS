# GoCreate OS v6.2 reconstruction

## Included
- Single canonical GitHub source tree for Windows and Vercel.
- Firebase Admin-backed API routes for people, badges, attendance, guests, settings, reports, analytics, schedule, calendar, audit, kiosks, access, communications queue and data quality.
- Firebase RTDB kiosk heartbeat/reset and Windows-core command channel.
- Remote kiosk reset support retained by the existing kiosk UI.
- Badge-link claims with expiry and phone verification.
- Guest waiver capture; birthday optional by default.
- Profile photos can be stored directly as Firestore data URLs (750 KB cap), avoiding broken Storage URLs for kiosk-sized portraits.
- Live presence now separates members, employees and guests, shows elapsed time, and shows upcoming staff.
- Staff schedule uses proportional time bars and generates minimum staffing with technician-qualified coverage warnings.
- Automatic employee checkout: scheduled staff after configured grace; unscheduled staff after closing; member closing checkout is also configurable.
- Analytics/report endpoints derive from operational Firestore records instead of placeholder data.
- SQLite read-only recovery importer.
- GoCreate portal sync targets https://portal.gocreate.com/ and reads membership-list, users-list and machine-scheduling-list.
- Windows install/configure/build/start/stop/LAN/kiosk/watchdog/auto-logon scripts.

## Deployment rule
Do not generate or maintain a separate Vercel-client repository. GitHub is the source of truth. Vercel deploys the Next.js app from the same repository; the Windows computer runs the edge-only workers from it.

## Validation performed in the build environment
JavaScript server/worker files passed `node --check`; the Python sync service passed `py_compile`; the source smoke check passed. A complete `next build` could not be run in the build environment because package installation did not complete there, so run `windows\\build.ps1` on the GoCreate computer before replacing the currently running installation.
