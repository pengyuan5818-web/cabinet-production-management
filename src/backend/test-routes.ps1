$ErrorActionPreference = 'SilentlyContinue'
$endpoints = @(
    'http://localhost:3001/api/dashboard/orders',
    'http://localhost:3001/api/dashboard/production',
    'http://localhost:3001/api/production/board'
)
foreach ($ep in $endpoints) {
    Write-Host "=== $ep ==="
    try {
        $r = Invoke-WebRequest -Uri $ep -UseBasicParsing
        Write-Host $r.Content.Substring(0, [Math]::Min(400, $r.Content.Length))
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
    }
    Write-Host ""
}
