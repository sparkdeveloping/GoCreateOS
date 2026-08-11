param([ValidateSet('Chrome','Edge')][string]$Browser='Chrome')
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path;$start="powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$root\windows\start.ps1`"";$kiosk="powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$root\windows\kiosk-watchdog.ps1`" -Browser $Browser"
schtasks /Create /TN 'GoCreateOS-Backend' /SC ONSTART /RU SYSTEM /RL HIGHEST /TR $start /F|Out-Null;schtasks /Create /TN 'GoCreateOS-Kiosk' /SC ONLOGON /TR $kiosk /F|Out-Null
powercfg /change standby-timeout-ac 0;powercfg /change monitor-timeout-ac 0;Write-Host 'Backend starts at Windows boot; kiosk starts at sign-in and is watched continuously.'
