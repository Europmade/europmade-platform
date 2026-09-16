# F9 Admin Affiliate Review Center
# Run: powershell -File scripts/e2e-f9-admin-affiliate-review.ps1
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

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
if ($bh -ne "200") { throw "backend $bh" }
Write-Host "OK health"

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

Write-Host "=== Source: Review Center UI ==="
$listSrc = Get-Content -Raw -LiteralPath "apps/admin/app/(shell)/affiliate/page.tsx"
$detailSrc = Get-Content -Raw -LiteralPath "apps/admin/app/(shell)/affiliate/[id]/page.tsx"
if ($listSrc -notmatch "Beoordelen") { throw "list missing Beoordelen" }
if ($listSrc -notmatch "Bekijken") { throw "list missing Bekijken" }
if ($detailSrc -notmatch "Goedkeuren") { throw "detail missing Goedkeuren" }
if ($detailSrc -notmatch "Afwijzen") { throw "detail missing Afwijzen" }
if ($detailSrc -notmatch "iban_masked") { throw "detail must render masked IBAN only" }
if ($detailSrc -match "row\.iban[^_]") { throw "detail must not render full IBAN field" }
Write-Host "OK UI source"

Write-Host "=== Register pending affiliate ==="
$aToken = New-Customer "aff-f9-ok-$ts@example.com" "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$legal = "F9 Aff Co $ts"
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/f9-$ts"
  legal_name=$legal
  iban=$iban
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "register affiliate $($regAff.raw)" }
$affiliateId = $regAff.json.affiliate.id
if ($regAff.json.affiliate.onboarding_status -ne "Ingediend") { throw "expected Ingediend" }

Write-Host "=== Admin list contains pending ==="
$list = Invoke-Json "$backend/admin/affiliates?status=Ingediend" "GET" $adminH $null
if ($list.status -ne 200) { throw "list $($list.raw)" }
$hit = @($list.json.affiliates) | Where-Object { $_.id -eq $affiliateId } | Select-Object -First 1
if (-not $hit) { throw "pending affiliate not in admin list" }
if ($hit.onboarding_status -ne "Ingediend") { throw "list status $($hit.onboarding_status)" }
if ($list.raw -match [regex]::Escape($iban)) { throw "full IBAN leaked in list JSON" }
if (-not $hit.iban_masked) { throw "iban_masked missing" }
if ($hit.iban_masked -eq $iban) { throw "iban_masked must not equal full IBAN" }
if ($hit.legal_name -ne $legal) { throw "legal_name expected $legal got $($hit.legal_name)" }

Write-Host "=== Admin opens detail ==="
$detail = Invoke-Json "$backend/admin/affiliates/$affiliateId" "GET" $adminH $null
if ($detail.status -ne 200) { throw "detail $($detail.raw)" }
if ($detail.json.affiliate.onboarding_status -ne "Ingediend") { throw "detail not pending" }
if ($detail.raw -match [regex]::Escape($iban)) { throw "full IBAN leaked in detail JSON" }
$uiList = curl.exe -s -o NUL -w "%{http_code}" "$adminUi/affiliate"
$uiDetail = curl.exe -s -o NUL -w "%{http_code}" "$adminUi/affiliate/$affiliateId"
if ($uiList -notin @("200","307","308")) { throw "admin list UI $uiList" }
if ($uiDetail -notin @("200","307","308")) { throw "admin detail UI $uiDetail" }
Write-Host "OK admin list+detail"

Write-Host "=== Approve ==="
$approve = Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}"
if ($approve.status -ne 200) { throw "approve $($approve.raw)" }
if ($approve.json.affiliate.onboarding_status -ne "Goedgekeurd") { throw "expected Goedgekeurd" }

$after = Invoke-Json "$backend/admin/affiliates/$affiliateId" "GET" $adminH $null
if ($after.json.affiliate.onboarding_status -ne "Goedgekeurd") { throw "detail still pending" }
$pending = Invoke-Json "$backend/admin/affiliates?status=Ingediend" "GET" $adminH $null
$stillPending = @($pending.json.affiliates) | Where-Object { $_.id -eq $affiliateId }
if ($stillPending.Count -ne 0) { throw "approved affiliate still listed as Ingediend" }

$again = Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}"
if ($again.status -lt 400) { throw "second approve must fail" }
Write-Host "OK approve + not pending review"

Write-Host "=== Reject ==="
$rToken = New-Customer "aff-f9-no-$ts@example.com" "Affiliate"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$regNo = Invoke-Json "$backend/store/affiliate" "POST" $rH (@{
  channel_url="https://blog.example.com/f9-no-$ts"
  legal_name="F9 Reject $ts"
  iban=$iban
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regNo.status -ne 201) { throw "register reject $($regNo.raw)" }
$rejectId = $regNo.json.affiliate.id
$noReason = Invoke-Json "$backend/admin/affiliates/$rejectId/reject" "POST" $adminH (@{ reason="" } | ConvertTo-Json -Compress)
if ($noReason.status -lt 400) { throw "reject without reason must fail" }
$reject = Invoke-Json "$backend/admin/affiliates/$rejectId/reject" "POST" $adminH (@{ reason="F9 e2e: kanaal niet verifieerbaar" } | ConvertTo-Json -Compress)
if ($reject.status -ne 200) { throw "reject $($reject.raw)" }
if ($reject.json.affiliate.onboarding_status -ne "Afgekeurd") { throw "expected Afgekeurd" }
if ($reject.json.affiliate.rejection_reason -notmatch "kanaal") { throw "rejection_reason missing" }
Write-Host "OK reject"

Write-Host "OK F9 admin affiliate review e2e passed approve=$affiliateId reject=$rejectId"
