$ErrorActionPreference='Stop';$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path;Set-Location $root;npm install;npm run lint:routes;npm run build
