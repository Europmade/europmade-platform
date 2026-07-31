# S3-01-05/06 + S3-07-04/05 Affiliate UI — run: powershell -File scripts/e2e-s3-07-04-05-affiliate-ui.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$web = "http://localhost:3000"
$pubKey = (Select-String -Path "$PSScriptRoot/../apps/web/.env.local" -Pattern "PUBLISHABLE_KEY=(.*)").Matches[0].Groups[1].Value.Trim()
$ts = Get-Date -Format "yyyyMMddHHmmss"
$pass = "TestPass123!"

function Invoke-Json($uri, $method, $headers, $jsonBody) {
  try {
    if ($null -ne $jsonBody) {
      $r = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -Body $jsonBody -UseBasicParsing
    } else {
      $r = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -UseBasicParsing
    }
    return @{ status = [int]$r.StatusCode; json = ($r.Content | ConvertFrom-Json); raw = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $json = $null
      try { $json = $raw | ConvertFrom-Json } catch {}
      return @{ status = [int]$resp.StatusCode; json = $json; raw = $raw }
    }
    throw
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

Write-Host "=== Health + auth UI (S3-01-05) ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }
foreach ($p in @("/login","/register","/forgot-password","/cookie-preferences","/affiliate/register","/affiliate","/affiliate/stats","/affiliate/commissions","/affiliate/links")) {
  $c = curl.exe -s -o NUL -w "%{http_code}" "$web$p"
  if ($c -ne "200") { throw "UI $p -> $c" }
  Write-Host "OK UI $p"
}

Write-Host "=== Register + login regression ==="
$probeEmail = "auth-ui-$ts@example.com"
$reg = Invoke-Json "$backend/auth/customer/emailpass/register" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probeEmail; password=$pass } | ConvertTo-Json -Compress)
if ($reg.status -notin 200,201) { throw "auth register $($reg.raw)" }
$login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probeEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login.status -ne 200 -or -not $login.json.token) { throw "auth login $($login.raw)" }
Write-Host "OK register/login"

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$aEmail = "aff-ui-$ts@example.com"
$aToken = New-Customer $aEmail "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Consent banner API (S3-01-06) ==="
$visitor = "cookie-ui-$ts-abcdefgh"
$deny = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitor; consent_given=$false } | ConvertTo-Json -Compress)
if ($deny.status -ne 201) { throw "consent deny $($deny.raw)" }
$accept = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitor; consent_given=$true } | ConvertTo-Json -Compress)
if ($accept.status -ne 201) { throw "consent accept $($accept.raw)" }
$dbConsent = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from consent_record where consent_given = true;"
if ([int]$dbConsent -lt 1) { throw "no consent_record" }
Write-Host "OK ConsentRecord"

Write-Host "=== Affiliate register no auto-approve (S3-07-04) ==="
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/ui-$ts"
  legal_name="UI Aff $ts"
  iban="NL91ABNA0417164300"
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "register $($regAff.raw)" }
if ($regAff.json.affiliate.onboarding_status -ne "Ingediend") { throw "auto-approve must not happen" }
$affiliateId = $regAff.json.affiliate.id

$dashBlocked = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
if ($dashBlocked.status -lt 400) { throw "dashboard before approve must fail" }

Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}" | Out-Null

Write-Host "=== Dashboard APIs (S3-07-05) ==="
$dash = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
if ($dash.status -ne 200) { throw "dashboard $($dash.raw)" }
if ($null -eq $dash.json.kpis) { throw "missing kpis" }

$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/p/demo-$ts" } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }

$stats = Invoke-Json "$backend/store/affiliate/stats" "GET" $aH $null
if ($stats.status -ne 200) { throw "stats $($stats.raw)" }
$hit = @($stats.json.link_stats) | Where-Object { $_.link_id -eq $link.json.link.id } | Select-Object -First 1
if (-not $hit) { throw "link missing in stats" }

$comms = Invoke-Json "$backend/store/affiliate/commissions" "GET" $aH $null
if ($comms.status -ne 200) { throw "commissions $($comms.raw)" }

$cpn = Invoke-Json "$backend/store/affiliate/coupons" "POST" $aH (@{ code="UI$ts" } | ConvertTo-Json -Compress)
if ($cpn.status -ne 201) { throw "coupon $($cpn.raw)" }

Write-Host "OK S3-01-05/06 + S3-07-04/05 affiliate UI e2e passed affiliate=$affiliateId"
