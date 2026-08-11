param([switch]$Quiet);$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Get-CimInstance Win32_Process|?{$_.CommandLine -like "*$root*" -and ($_.Name -in @('node.exe','python.exe','pythonw.exe','cmd.exe'))}|%{Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}
if(!$Quiet){Write-Host 'GoCreate OS processes stopped.'}
