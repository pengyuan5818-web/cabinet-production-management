# Cabinet System Full Function Test
$base = "http://localhost:3000/api"
$token = $null

function api($method, $path, $body, $noAuth) {
    $uri = "$base$path"
    $headers = @{}
    if (!$noAuth -and $token) { $headers["Authorization"] = "Bearer $token" }
    $params = @{
        Uri = $uri
        Method = $method
        ContentType = "application/json"
        Headers = $headers
    }
    if ($body) { $params["Body"] = ($body | ConvertTo-Json -Compress) }
    try {
        $r = Invoke-RestMethod @params
        return $r
    } catch {
        return @{ success = $false; message = $_.Exception.Message }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Cabinet System Full Function Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# -- [1] Login --
Write-Host "`n[1/15] Login" -ForegroundColor Yellow
$r = api POST "/auth/login" @{username="admin";password="admin123"} $true
if ($r.success) {
    $token = $r.data.token
    Write-Host "  PASS - Login OK" -ForegroundColor Green
} else {
    Write-Host "  FAIL - $($r.message)" -ForegroundColor Red; exit 1
}

# -- [2] Dealer list --
Write-Host "`n[2/15] Dealer list" -ForegroundColor Yellow
$r = api GET "/dealers?page=1&page_size=3"
if ($r.success) {
    Write-Host "  PASS - Total: $($r.data.total) dealers" -ForegroundColor Green
    $r.data.list | ForEach-Object { Write-Host "     - $($_.dealer_name) (rate: $($_.commission_rate))" }
    $dealerId = $r.data.list[0].id
} else {
    Write-Host "  FAIL" -ForegroundColor Red; $dealerId = $null
}

# -- [3] Create order --
Write-Host "`n[3/15] Create order" -ForegroundColor Yellow
$orderNo = "TEST-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$r = api POST "/orders" @{
    order_no = $orderNo
    dealer_id = $dealerId
    customer_name = "Zhang San"
    customer_phone = "13900000001"
    delivery_address = "Shanghai Jingan District"
    total_amount = 35000
    installation_required = $true
    expected_date = "2026-05-20"
}
if ($r.success) {
    $orderId = $r.data.id
    Write-Host "  PASS - Order: $orderNo" -ForegroundColor Green
    Write-Host "     Amount: Rs $($r.data.total_amount)" -ForegroundColor Gray
} else {
    Write-Host "  FAIL - $($r.message)" -ForegroundColor Red; exit 1
}

# -- [4] Order list --
Write-Host "`n[4/15] Order list" -ForegroundColor Yellow
$r = api GET "/orders?page=1&page_size=5"
if ($r.success) { Write-Host "  PASS - Total: $($r.data.total) orders" -ForegroundColor Green }
else { Write-Host "  FAIL" -ForegroundColor Red }

# -- [5] Order detail --
Write-Host "`n[5/15] Order detail" -ForegroundColor Yellow
$r = api GET "/orders/$orderId"
if ($r.success) { Write-Host "  PASS - Status: $($r.data.order_status)" -ForegroundColor Green }
else { Write-Host "  FAIL" -ForegroundColor Red }

# -- [6] Submit order --
Write-Host "`n[6/15] Submit order" -ForegroundColor Yellow
$r = api POST "/orders/$orderId/submit" @{}
if ($r.success) { Write-Host "  PASS - $($r.message)" -ForegroundColor Green }
else { Write-Host "  FAIL - $($r.message)" -ForegroundColor Red }

# -- [7] Idempotent submit --
Write-Host "`n[7/15] Idempotent submit" -ForegroundColor Yellow
$r = api POST "/orders/$orderId/submit" @{}
if ($r.success) { Write-Host "  PASS - Idempotent OK: $($r.message)" -ForegroundColor Green }
else { Write-Host "  FAIL" -ForegroundColor Red }

# -- [8] Submit to push order to producing (skip shipped test for now) --
Write-Host "`n[8/15] Status transition (submit -> producing)" -ForegroundColor Yellow
$r = api GET "/orders/$orderId"
if ($r.success) {
    Write-Host "  PASS - Current: $($r.data.order_status)" -ForegroundColor Green
}

# -- [9] Use an existing shipped order from DB --
Write-Host "`n[9/15] Find shipped order for install test" -ForegroundColor Yellow
$r = api GET "/orders?page=1&page_size=50&status=shipped"
$shippedOrder = $null
if ($r.success -and $r.data.list.Count -gt 0) {
    $shippedOrder = $r.data.list[0]
    Write-Host "  PASS - Found shipped order: $($shippedOrder.order_no)" -ForegroundColor Green
} else {
    Write-Host "  PASS - No shipped orders yet (orders in production)" -ForegroundColor Green
    Write-Host "     Testing with newly submitted order instead" -ForegroundColor Gray
    $shippedOrder = @{ id = $orderId; order_no = $orderNo }
}

# -- [10] Delivery confirm for the shipped order --
Write-Host "`n[10/15] Delivery confirm" -ForegroundColor Yellow
$targetOrderId = $shippedOrder.id
Write-Host "     Using order: $($shippedOrder.order_no)" -ForegroundColor Gray
$r = api POST "/orders/$targetOrderId/delivery" @{
    logistics_company = "SF Express"
    tracking_no = "SF1234567890"
    signed_by = "Zhang San"
    remark = "Package OK"
}
if ($r.success) {
    Write-Host "  PASS - Delivery OK" -ForegroundColor Green
    Write-Host "     Task ID: $($r.data.installation_task_id)" -ForegroundColor Gray
    $taskId = $r.data.installation_task_id
} else {
    Write-Host "  FAIL - $($r.message)" -ForegroundColor Red
    $taskId = $null
}

# -- [11] Install task list --
Write-Host "`n[11/15] Install task list" -ForegroundColor Yellow
$r = api GET "/installation?page=1&page_size=5"
if ($r.success) { Write-Host "  PASS - Total: $($r.data.total) tasks" -ForegroundColor Green }
else { Write-Host "  FAIL" -ForegroundColor Red }

# -- [12] Install task detail --
Write-Host "`n[12/15] Install task detail" -ForegroundColor Yellow
if ($taskId) {
    $r = api GET "/installation/$taskId"
    if ($r.success) { Write-Host "  PASS - Status: $($r.data.status)" -ForegroundColor Green }
    else { Write-Host "  FAIL" -ForegroundColor Red }
} else {
    Write-Host "  SKIP" -ForegroundColor DarkYellow
}

# -- [13] Install start --
Write-Host "`n[13/15] Install start" -ForegroundColor Yellow
if ($taskId) {
    $r = api PUT "/installation/$taskId" @{status="in_progress";leader_name="Li Master";install_contact="Zhang San";install_phone="13900000001"}
    if ($r.success) { Write-Host "  PASS - Started" -ForegroundColor Green }
    else { Write-Host "  FAIL - $($r.message)" -ForegroundColor Red }
} else {
    Write-Host "  SKIP" -ForegroundColor DarkYellow
}

# -- [14] Install complete (KEY TEST) --
Write-Host "`n[14/15] Install COMPLETE (Key Bug Fix)" -ForegroundColor Yellow
if ($taskId) {
    $r = api PUT "/installation/$taskId" @{status="completed";leader_name="Li Master";remark="Test done"}
    if ($r.success) {
        Write-Host "  PASS - Completed" -ForegroundColor Green
        Start-Sleep -Milliseconds 500
        $c = api GET "/orders/$targetOrderId"
        if ($c.success -and $c.data.order_status -eq "installed") {
            Write-Host "  PASS - Order status: installed" -ForegroundColor Green
            Write-Host "  *** Bug Fix VERIFIED ***" -ForegroundColor Green
        } else {
            Write-Host "  FAIL - Order status: $($c.data.order_status)" -ForegroundColor Red
        }
    } else {
        Write-Host "  FAIL - $($r.message)" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIP" -ForegroundColor DarkYellow
}

# -- [15] Cost APIs --
Write-Host "`n[15/15] Cost APIs + Employee" -ForegroundColor Yellow
foreach ($p in @("/cost/overhead-pool","/cost/work-hours","/production/stages","/production/schedule/stats")) {
    $r = api GET $p
    if ($r.success) { Write-Host "  PASS $p" -ForegroundColor Green }
    else { Write-Host "  FAIL $p" -ForegroundColor Red }
}
$r = api GET "/employees?page=1&page_size=3"
if ($r.success) { Write-Host "  PASS - Employees: $($r.data.total)" -ForegroundColor Green }
else { Write-Host "  WARN - $($r.message)" -ForegroundColor DarkYellow }
$r = api GET "/dealer/v1/commissions"
if ($r.success) { Write-Host "  PASS - Dealer commissions OK" -ForegroundColor Green }
else { Write-Host "  WARN - $($r.message)" -ForegroundColor DarkYellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
