$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

& "$PSScriptRoot\stop.ps1" -Quiet

$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Start-Logged {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [string[]]$Arguments = @()
    )

    $stdout = Join-Path $logDir "$Name.log"
    $stderr = Join-Path $logDir "$Name-error.log"

    $params = @{
        FilePath               = $Executable
        WorkingDirectory       = $root
        WindowStyle            = 'Hidden'
        RedirectStandardOutput = $stdout
        RedirectStandardError  = $stderr
        PassThru               = $true
    }

    if ($Arguments.Count -gt 0) {
        $params.ArgumentList = $Arguments
    }

    $process = Start-Process @params

    Write-Host ("Started {0} (PID {1})" -f $Name, $process.Id)
}

# Load the configured environment.
$envFile = Join-Path $root '.env'

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()

        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $key, $value = $line.Split('=', 2)

            $value = $value.Trim()

            if (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            ) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            [Environment]::SetEnvironmentVariable(
                $key.Trim(),
                $value,
                'Process'
            )
        }
    }

    Write-Host "Loaded environment: $envFile"
}
else {
    Write-Warning "Environment file was not found: $envFile"
}

# Next.js web application
Start-Logged `
    -Name 'web' `
    -Executable 'cmd.exe' `
    -Arguments @('/c', 'npm run start -- -H 0.0.0.0 -p 3000')

# Python GoCreate portal synchronization service
$pythonCandidates = @(
    (Join-Path $root 'services\sync.venv\Scripts\python.exe'),
    (Join-Path $root 'services\sync\.venv\Scripts\python.exe')
)

$python = $pythonCandidates |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

if ($python) {
    Start-Logged `
        -Name 'sync' `
        -Executable $python `
        -Arguments @('services\sync\run.py')
}
else {
    Write-Warning 'Sync Python environment was not found. Web application will continue without the sync service.'
}

# Background workers
Start-Logged `
    -Name 'operations' `
    -Executable 'node.exe' `
    -Arguments @('scripts\operations-worker.mjs')

Start-Logged `
    -Name 'analytics' `
    -Executable 'node.exe' `
    -Arguments @('scripts\analytics-worker.mjs')

Start-Logged `
    -Name 'commands' `
    -Executable 'node.exe' `
    -Arguments @('scripts\core-command-worker.mjs')

Start-Sleep -Seconds 3

Write-Host ''
Write-Host 'GoCreate OS v6.2 is running.'
Write-Host 'Kiosk:       http://127.0.0.1:3000/kiosk'
Write-Host 'Admin:       http://127.0.0.1:3000/admin'
Write-Host 'Web health:  http://127.0.0.1:3000/api/health'
Write-Host 'Sync health: http://127.0.0.1:8000/health'
