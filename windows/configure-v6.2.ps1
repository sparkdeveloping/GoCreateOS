param([Parameter(Mandatory=$true)][string]$ServiceAccountPath,[Parameter(Mandatory=$true)][string]$GoCreateEmail,[string]$FirebaseProjectId='jollytiles',[string]$FirebaseDatabaseUrl='https://jollytiles-default-rtdb.firebaseio.com',[string]$SuperAdminEmails='',[string]$KioskId='front-door',[string]$KioskLabel='Front Desk')
$ErrorActionPreference='Stop';$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path;$secretDir='C:\GoCreate\secrets';New-Item -ItemType Directory -Force $secretDir|Out-Null;$dest=Join-Path $secretDir 'jollytiles-service-account.json';if((Resolve-Path $ServiceAccountPath).Path -ne $dest){Copy-Item $ServiceAccountPath $dest -Force}
$pw=Read-Host 'GoCreate portal password' -AsSecureString;$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw);try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
$session=[Convert]::ToBase64String((1..48|%{Get-Random -Maximum 256}))
@"
GOCREATE_DEPLOYMENT_MODE=core
FIREBASE_PROJECT_ID=$FirebaseProjectId
FIREBASE_DATABASE_URL=$FirebaseDatabaseUrl
GOOGLE_APPLICATION_CREDENTIALS=$dest
GOCREATE_SESSION_SECRET=$session
SUPER_ADMIN_EMAILS=$SuperAdminEmails
NEXT_PUBLIC_GOCREATE_API_URL=
NEXT_PUBLIC_KIOSK_ID=$KioskId
NEXT_PUBLIC_KIOSK_LABEL=$KioskLabel
LOCAL_CACHE_PATH=C:\GoCreate\data\gocreate-cache.sqlite
"@ | Set-Content "$root\.env" -Encoding UTF8
@"
GOCREATE_BASE_URL=https://portal.gocreate.com/
GOCREATE_EMAIL=$GoCreateEmail
GOCREATE_PASSWORD=$plain
FIREBASE_PROJECT_ID=$FirebaseProjectId
FIREBASE_DATABASE_URL=$FirebaseDatabaseUrl
GOOGLE_APPLICATION_CREDENTIALS=$dest
RUN_SYNC_ON_START=true
HEADLESS=true
"@ | Set-Content "$root\services\sync\.env" -Encoding UTF8
Write-Host 'Configured GoCreate OS v6.2.';Write-Host "Firebase project: $FirebaseProjectId";Write-Host 'Portal: https://portal.gocreate.com/'
