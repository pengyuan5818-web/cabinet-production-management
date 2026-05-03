$baseUrl = "http://localhost:3000"

# Login
$r = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -UseBasicParsing
$token = ($r.Content | ConvertFrom-Json).data.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "=== Detailed Bug Investigation ==="
Write-Host ""

# Bug 1: GET /api/dealers/1/webhook-logs (500 InternalServerError)
Write-Host "=== [Bug1] GET /api/dealers/1/webhook-logs ==="
try {
    $resp = Invoke-WebRequest -Uri "$baseUrl/api/dealers/1/webhook-logs" -Headers $headers -UseBasicParsing
    Write-Host "Status: $($resp.StatusCode)"
} catch {
    $ex = $_.Exception.Response
    Write-Host "Status: $($ex.StatusCode)"
    try {
        $reader = [System.IO.StreamReader]::new($ex.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Body: $errBody"
    } catch {}
}
Write-Host ""

# Bug 2: POST /api/cost/calculate/batch (400 BadRequest)
Write-Host "=== [Bug2] POST /api/cost/calculate/batch ==="
$body = '{"order_ids":["test-id-1","test-id-2"]}'
try {
    $resp = Invoke-WebRequest -Uri "$baseUrl/api/cost/calculate/batch" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    $ex = $_.Exception.Response
    Write-Host "Status: $($ex.StatusCode)"
    try {
        $reader = [System.IO.StreamReader]::new($ex.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Body: $errBody"
    } catch {}
}
Write-Host ""

# Bug 3: POST /api/shipment (400 BadRequest)
Write-Host "=== [Bug3] POST /api/shipment ==="
$body = '{"order_id":"some-fake-id"}'
try {
    $resp = Invoke-WebRequest -Uri "$baseUrl/api/shipment" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
} catch {
    $ex = $_.Exception.Response
    Write-Host "Status: $($ex.StatusCode)"
    try {
        $reader = [System.IO.StreamReader]::new($ex.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Body: $errBody"
    } catch {}
}
Write-Host ""

# Bug 4: GET /api/reports/employee/performance (empty data but 200)
Write-Host "=== [Bug4] GET /api/reports/employee/performance ==="
$resp = Invoke-WebRequest -Uri "$baseUrl/api/reports/employee/performance" -Headers $headers -UseBasicParsing
Write-Host "Status: $($resp.StatusCode)"
$json = $resp.Content | ConvertFrom-Json
Write-Host "Data count: $($json.data.Count)"
if ($json.data.Count -gt 0) { $json.data | ForEach-Object { Write-Host $_ } }
Write-Host ""

# Bug 5: POST /api/auth/login returns empty data when called again
Write-Host "=== [Bug5] POST /api/auth/login again ==="
$r2 = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -UseBasicParsing
$json2 = $r2.Content | ConvertFrom-Json
Write-Host "Status: $($r2.StatusCode), success: $($json2.success), has token: $(-not [string]::IsNullOrEmpty($json2.data.token))"
Write-Host ""

# Test report routes
Write-Host "=== [Bug6] GET /api/reports/production/scheduling ==="
$resp = Invoke-WebRequest -Uri "$baseUrl/api/reports/production/scheduling" -Headers $headers -UseBasicParsing
$json3 = $resp.Content | ConvertFrom-Json
Write-Host "Status: $($resp.StatusCode), data count: $($json3.data.Count)"
Write-Host ""

# Test employee production
Write-Host "=== [Bug7] GET /api/reports/employee/production ==="
$resp = Invoke-WebRequest -Uri "$baseUrl/api/reports/employee/production" -Headers $headers -UseBasicParsing
$json4 = $resp.Content | ConvertFrom-Json
Write-Host "Status: $($resp.StatusCode), data: $($json4.data | ConvertTo-Json -Depth 2)"
Write-Host ""

Write-Host "=== Done ==="
