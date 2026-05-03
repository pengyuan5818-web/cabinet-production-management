$baseUrl = "http://localhost:3000"

# Login
Write-Host "=== [1] POST /api/auth/login ==="
$r = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -UseBasicParsing
$token = ($r.Content | ConvertFrom-Json).data.token
Write-Host "Status: $($r.StatusCode)"
Write-Host "Token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

function Test-API {
    param($method, $endpoint, $body = $null, $desc = "")
    Write-Host "=== $method $endpoint ===" -ForegroundColor Cyan
    if ($desc) { Write-Host "DESC: $desc" }
    try {
        $params = @{
            Uri = "$baseUrl$endpoint"
            Headers = $headers
            UseBasicParsing = $true
        }
        if ($method -eq "POST" -and $body) {
            $params.Method = "POST"
            $params.Body = $body
        } else {
            $params.Method = "GET"
        }
        $resp = Invoke-WebRequest @params -ErrorAction Stop
        Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
        $json = $resp.Content | ConvertFrom-Json
        if ($json.success -eq $false) {
            Write-Host "ERROR: $($json.message)" -ForegroundColor Red
        } else {
            Write-Host "SUCCESS: $($json.data.Count) records" -ForegroundColor Green
        }
    } catch {
        $ex = $_.Exception.Response
        if ($ex) {
            Write-Host "Status: $($ex.StatusCode)" -ForegroundColor Red
            try {
                $reader = [System.IO.StreamReader]::new($ex.GetResponseStream())
                $errBody = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "Error Body: $errBody" -ForegroundColor Red
            } catch {}
        } else {
            Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Auth APIs
Test-API "POST" "/api/auth/login" '{"username":"admin","password":"admin123"}' "Login"

# Order APIs
Test-API "GET" "/api/orders" "" "Get all orders"
Test-API "POST" "/api/orders" '{"customerName":"测试客户","contactPhone":"13800138000","status":"pending"}' "Create order"

# Production APIs
Test-API "POST" "/api/production/schedule/generate" '{"orderId":"test"}' "Generate schedule"
Test-API "GET" "/api/production/stages" "" "Get production stages"

# Cost APIs
Test-API "GET" "/api/cost/report/detail" "" "Cost report detail"
Test-API "GET" "/api/cost/allocation/pool" "" "Cost allocation pool"
Test-API "POST" "/api/cost/calculate/batch" '{"orderIds":[]}' "Batch cost calculate"

# Reports APIs
Test-API "GET" "/api/reports/production/scheduling" "" "Production scheduling report"
Test-API "GET" "/api/reports/employee/performance" "" "Employee performance"
Test-API "GET" "/api/reports/employee/production" "" "Employee production"

# Dealer APIs
Test-API "GET" "/api/dealers/commissions" "" "Dealer commissions"
Test-API "GET" "/api/dealers/1/webhook-logs" "" "Webhook logs (dealer id=1)"

# Finance APIs
Test-API "GET" "/api/finance/customer-arrears" "" "Customer arrears"
Test-API "GET" "/api/finance/dealer-arrears" "" "Dealer arrears"
Test-API "GET" "/api/finance/supplier-arrears" "" "Supplier arrears"

# Warehouse APIs
Test-API "GET" "/api/warehouse/materials" "" "Warehouse materials"

# Shipment APIs
Test-API "POST" "/api/shipment" '{"orderId":"test"}' "Create shipment"

# System APIs
Test-API "GET" "/api/system/config" "" "System config"

Write-Host "=== Test Complete ==="
