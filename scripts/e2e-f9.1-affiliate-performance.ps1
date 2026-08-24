# F9.1 Admin Affiliate Performance Center
# Run: powershell -File scripts/e2e-f9.1-affiliate-performance.ps1
$ErrorActionPreference = "Stop"
$backend = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://127.0.0.1:9000" }
$adminUi = if ($env:ADMIN_URL) { $env:ADMIN_URL } else { "http://127.0.0.1:3001" }
$pubKey = (Select-String -Path "$PSScriptRoot/../apps/web/.env.local" -Pattern "PUBLISHABLE_KEY=(.*)").Matches[0].Groups[1].Value.Trim()
$ts = Get-Date -Format "yyyyMMddHHmmss"
$pass = "REDACTED_E2E_PASSWORD"
$iban = "NL91ABNA0417164300"

function Invoke-Json($uri, $method, $headers, $jsonBody) {
  try {
    if ($null -ne $jsonBody) {
      $r = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -Body $jsonBody -UseBasicParsing
    } else {
      $r = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -UseBasicParsing
    }
    return @{ status = [int]$r.StatusCode; json = ($r.Content | ConvertFrom-Json); raw = $r.Content }
  } catch {
    $raw = $null
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $raw = $_.ErrorDetails.Message }
    $status = 0
    $resp = $_.Exception.Response
    if ($resp) {
      try { $status = [int]$resp.StatusCode } catch {}
      if (-not $raw) {
        try {
          $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
          $raw = $reader.ReadToEnd()
        } catch {}
      }
    }
    if (-not $raw) { $raw = $_.Exception.Message }
    $json = $null
    try { if ($raw) { $json = $raw | ConvertFrom-Json } } catch {}
    return @{ status = $status; json = $json; raw = $raw }
  }
}

function New-Customer($email, $roleLabel) {
  $reg = Invoke-Json "$backend/auth/customer/emailpass/register" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($reg.status -notin 200,201) { throw "register $($reg.raw)" }
  Invoke-Json "$backend/store/customers" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey; "Authorization"="Bearer $($reg.json.token)" } (@{ email=$email; first_name=$roleLabel; last_name="E2E" } | ConvertTo-Json -Compress) | Out-Null
  $login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($login.status -ne 200) { throw "login $($login.raw)" }
  return $login.json.token
}

function Assert-PerformanceShape($payload, $expectedDays) {
  if ($payload.period_days -ne $expectedDays) { throw "period_days $($payload.period_days) expected $expectedDays" }
  $totals = $payload.totals
  foreach ($key in @("active_affiliates","pending_affiliates","clicks","conversions","orders","revenue","commission_awarded","payouts_scheduled","payout_open","conversion_rate")) {
    if ($null -eq $totals.$key) { throw "totals missing $key" }
  }
  if ($null -eq $payload.affiliates) { throw "affiliates missing" }
  if ($payload.conversion_rate_definition -notmatch "click-based") { throw "conversion_rate_definition missing" }
}

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
if ($bh -ne "200") { throw "backend $bh" }
Write-Host "OK health"

Write-Host "=== Source: no store dashboard fan-out ==="
$listSrc = Get-Content -Raw -LiteralPath "apps/admin/app/(shell)/affiliate/page.tsx"
$detailSrc = Get-Content -Raw -LiteralPath "apps/admin/app/(shell)/affiliate/[id]/page.tsx"
$apiSrc = Get-Content -Raw -LiteralPath "apps/admin/lib/affiliate-admin-api.ts"
if ($listSrc -notmatch "Affiliate Performance") { throw "list missing Affiliate Performance" }
if ($listSrc -notmatch "Beoordelen") { throw "list missing Beoordelen" }
if ($listSrc -notmatch "Bekijken") { throw "list missing Bekijken" }
if ($detailSrc -notmatch "Affiliate Performance") { throw "detail missing Affiliate Performance" }
if ($detailSrc -notmatch "Goedkeuren") { throw "detail missing Goedkeuren" }
if ($apiSrc -notmatch "/admin/affiliates/performance") { throw "client missing performance API" }
if ($apiSrc -match "/store/affiliate/dashboard") { throw "admin client must not call store dashboard" }
if ($listSrc -match "/store/affiliate/dashboard") { throw "list must not call store dashboard" }
Write-Host "OK UI source"

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

Write-Host "=== Register pending affiliate ==="
$aToken = New-Customer "aff-f91-$ts@example.com" "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$legal = "F91 Aff Co $ts"
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/f91-$ts"
  legal_name=$legal
  iban=$iban
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "register affiliate $($regAff.raw)" }
$affiliateId = $regAff.json.affiliate.id

Write-Host "=== Admin performance default 30 ==="
$def = Invoke-Json "$backend/admin/affiliates/performance" "GET" $adminH $null
if ($def.status -ne 200) { throw "performance default $($def.status) $($def.raw)" }
Assert-PerformanceShape $def.json 30
$hit = @($def.json.affiliates) | Where-Object { $_.affiliate_id -eq $affiliateId } | Select-Object -First 1
if (-not $hit) { throw "new affiliate missing from performance list" }
if ($hit.onboarding_status -ne "Ingediend") { throw "expected Ingediend in performance row" }
if ($hit.legal_name -ne $legal) { throw "legal_name expected $legal" }
Write-Host "OK default 30 + per-affiliate row"

Write-Host "=== period 7 and 90 ==="
$p7 = Invoke-Json "$backend/admin/affiliates/performance?period_days=7" "GET" $adminH $null
if ($p7.status -ne 200) { throw "period 7 $($p7.raw)" }
Assert-PerformanceShape $p7.json 7
$p90 = Invoke-Json "$backend/admin/affiliates/performance?period_days=90" "GET" $adminH $null
if ($p90.status -ne 200) { throw "period 90 $($p90.raw)" }
Assert-PerformanceShape $p90.json 90
Write-Host "OK 7 and 90"

Write-Host "=== Admin-only: customer cannot read performance ==="
$noAuth = Invoke-Json "$backend/admin/affiliates/performance" "GET" @{ "Content-Type"="application/json" } $null
if ($noAuth.status -notin @(401, 403)) { throw "unauthenticated performance must be 401/403 got $($noAuth.status)" }
$cust = Invoke-Json "$backend/admin/affiliates/performance" "GET" $aH $null
if ($cust.status -notin @(401, 403)) { throw "customer token must not access admin performance, got $($cust.status) $($cust.raw)" }
$otherToken = New-Customer "buyer-f91-$ts@example.com" "Buyer"
$otherH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $otherToken"; "x-publishable-api-key"=$pubKey }
$other = Invoke-Json "$backend/admin/affiliates/performance" "GET" $otherH $null
if ($other.status -notin @(401, 403)) { throw "other customer must not access admin performance, got $($other.status)" }
Write-Host "OK admin-only"

Write-Host "=== F9 approve/reject still works ==="
$approve = Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}"
if ($approve.status -ne 200) { throw "approve $($approve.raw)" }
if ($approve.json.affiliate.onboarding_status -ne "Goedgekeurd") { throw "expected Goedgekeurd" }
$after = Invoke-Json "$backend/admin/affiliates/performance?period_days=30" "GET" $adminH $null
$afterHit = @($after.json.affiliates) | Where-Object { $_.affiliate_id -eq $affiliateId } | Select-Object -First 1
if ($afterHit.onboarding_status -ne "Goedgekeurd") { throw "performance row not approved" }

$rToken = New-Customer "aff-f91-no-$ts@example.com" "Affiliate"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$regNo = Invoke-Json "$backend/store/affiliate" "POST" $rH (@{
  channel_url="https://blog.example.com/f91-no-$ts"
  legal_name="F91 Reject $ts"
  iban=$iban
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regNo.status -ne 201) { throw "register reject $($regNo.raw)" }
$rejectId = $regNo.json.affiliate.id
$reject = Invoke-Json "$backend/admin/affiliates/$rejectId/reject" "POST" $adminH (@{ reason="F9.1 e2e: kanaal niet verifieerbaar" } | ConvertTo-Json -Compress)
if ($reject.status -ne 200) { throw "reject $($reject.raw)" }
if ($reject.json.affiliate.onboarding_status -ne "Afgekeurd") { throw "expected Afgekeurd" }
Write-Host "OK approve/reject"

$uiList = curl.exe -s -o NUL -w "%{http_code}" "$adminUi/affiliate"
$uiDetail = curl.exe -s -o NUL -w "%{http_code}" "$adminUi/affiliate/$affiliateId"
if ($uiList -notin @("200","307","308")) { throw "admin list UI $uiList" }
if ($uiDetail -notin @("200","307","308")) { throw "admin detail UI $uiDetail" }

Write-Host "OK F9.1 affiliate performance e2e passed affiliate=$affiliateId reject=$rejectId"
