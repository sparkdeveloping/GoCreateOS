$ErrorActionPreference='Stop'; $root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path; Set-Location $root
Write-Host 'Installing GoCreate OS v6.2...'; npm install
$venv=Join-Path $root 'services\sync.venv'; if(!(Test-Path "$venv\Scripts\python.exe")){py -3 -m venv $venv}
& "$venv\Scripts\python.exe" -m pip install -U pip
& "$venv\Scripts\python.exe" -m pip install -r "$root\services\sync\requirements.txt"
& "$venv\Scripts\python.exe" -m playwright install chromium
New-Item -ItemType Directory -Force "$root\logs","C:\GoCreate\data","C:\GoCreate\secrets"|Out-Null
Write-Host 'Install complete. Next run windows\configure-v6.2.ps1, then windows\start.ps1.'
