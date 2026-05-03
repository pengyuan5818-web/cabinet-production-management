$ErrorActionPreference = 'Stop'
$dir = "C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src"
$proc = Start-Process -FilePath 'node' -ArgumentList 'index.js' -WorkingDirectory $dir -PassThru -WindowStyle Hidden
Start-Sleep 5
$listening = netstat -ano | Select-String ':3000.*LISTENING'
Write-Host "PID:$($proc.Id)"
if ($listening) { Write-Host "OK: $listening" } else { Write-Host "NOT LISTENING" }
