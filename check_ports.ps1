# Check what's using key ports
$ports = @(80, 443, 5173, 5174, 3000, 8080)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        Write-Host "=== Port $port ===" -ForegroundColor Cyan
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            $procName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            Write-Host "  PID: $($conn.OwningProcess) | Process: $procName | State: $($conn.State) | Local: $($conn.LocalAddress):$($conn.LocalPort)"
        }
    }
}
