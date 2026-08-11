# Run as Administrator
New-NetFirewallRule -DisplayName 'GoCreate OS Web' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Domain,Private -ErrorAction SilentlyContinue|Out-Null
Get-NetIPAddress -AddressFamily IPv4|?{$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*'}|%{Write-Host "Admin: http://$($_.IPAddress):3000/admin";Write-Host "Kiosk: http://$($_.IPAddress):3000/kiosk"}
