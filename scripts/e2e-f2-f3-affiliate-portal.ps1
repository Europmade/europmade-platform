# F2/F3 Affiliate Portal Foundation + Productzoeker
# Run: powershell -File scripts/e2e-f2-f3-affiliate-portal.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$web = if ($env:WEB_URL) { $env:WEB_URL } else { "http://localhost:3000" }
$pubKey = (Select-String -Path "$PSScriptRoot/../apps/web/.env.local" -Pattern "PUBLISHABLE_KEY=(.*)").Matches[0].Groups[1].Value.Trim()
$ts = Get-Date -Format "yyyyMMddHHmmss"
$pass = "REDACTED_E2E_PASSWORD"

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

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh (set WEB_URL if not :3000)" }
Write-Host "OK health backend+web"

Write-Host "=== 1. Public /affiliate marketing page ==="
$landing = curl.exe -s "$web/affiliate"
if ($landing -notmatch "Word affiliate|Become an affiliate|Affiliate werden|Devenir affilié") {
  throw "public /affiliate missing CTA"
}
if ($landing -notmatch "5%") { throw "public page should mention 5% ADR commission" }
if ($landing -notmatch "30") { throw "public page should mention 30-day attribution" }
Write-Host "OK public marketing page"

Write-Host "=== 2. Register CTA route ==="
$regUi = curl.exe -s -o NUL -w "%{http_code}" "$web/affiliate/register"
if ($regUi -ne "200") { throw "register UI $regUi" }
Write-Host "OK register CTA"

Write-Host "=== Auth + affiliate setup ==="
$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$aEmail = "aff-f2f3-$ts@example.com"
$aToken = New-Customer $aEmail "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
Write-Host "OK 3. login customer"

$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/f2f3-$ts"
  legal_name="F2F3 Aff $ts"
  iban="NL91ABNA0417164300"
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "affiliate register $($regAff.raw)" }
if ($regAff.json.affiliate.onboarding_status -ne "Ingediend") { throw "must stay Ingediend" }
$affiliateId = $regAff.json.affiliate.id

Write-Host "=== 14. Non-approved blocked ==="
$dashBlocked = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
if ($dashBlocked.status -lt 400) { throw "dashboard before approve must fail" }
$settingsBlocked = Invoke-Json "$backend/store/affiliate/commission-settings" "GET" $aH $null
if ($settingsBlocked.status -lt 400) { throw "commission-settings before approve must fail" }
$linksBlocked = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/product/x" } | ConvertTo-Json -Compress)
if ($linksBlocked.status -lt 400) { throw "links before approve must fail" }
Write-Host "OK non-approved gate"

Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}" | Out-Null

Write-Host "=== 4. Dashboard APIs after approve ==="
$dash = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
if ($dash.status -ne 200) { throw "dashboard $($dash.raw)" }
Write-Host "OK dashboard API"

Write-Host "=== Dashboard UI routes ==="
foreach ($p in @(
  "/affiliate/dashboard",
  "/affiliate/dashboard/products",
  "/affiliate/dashboard/links",
  "/affiliate/dashboard/stats",
  "/affiliate/dashboard/commissions"
)) {
  $c = curl.exe -s -o NUL -w "%{http_code}" "$web$p"
  if ($c -notin @("200","307","308")) { throw "UI $p -> $c" }
  Write-Host "OK UI $p ($c)"
}

Write-Host "=== 6-7. Catalog sellable products ==="
$catalog = Invoke-Json "$backend/store/catalog/products?limit=24&region_code=NL" "GET" @{ "x-publishable-api-key"=$pubKey } $null
if ($catalog.status -ne 200) { throw "catalog $($catalog.raw)" }
$sellable = @($catalog.json.products) | Where-Object { $_.offer_count -gt 0 -and $null -ne $_.from_price }
if ($sellable.Count -lt 1) { throw "need at least one sellable catalog product for promote flow" }
$product = $sellable[0]
$productId = $product.id
Write-Host "OK catalog product=$productId offers=$($product.offer_count)"

Write-Host "=== 8-9. Commission settings from affiliate_commission_setting ==="
$settings = Invoke-Json "$backend/store/affiliate/commission-settings" "GET" $aH $null
if ($settings.status -ne 200) { throw "commission-settings $($settings.raw)" }
if ([double]$settings.json.percentage -ne 0.05) { throw "expected 5% default got $($settings.json.percentage)" }
if ([int]$settings.json.attribution_days -ne 30) { throw "expected 30 attribution days" }
if ($settings.json.percentage_display -ne "5%") { throw "display $($settings.json.percentage_display)" }
Write-Host "OK commission $($settings.json.percentage_display) / $($settings.json.attribution_days)d"

Write-Host "=== 10-11. Promote via POST /store/affiliate/links ==="
$target = "/product/$productId"
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url=$target } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "create link $($link.raw)" }
if (-not $link.json.link.tracking_param) { throw "missing tracking_param" }
if ($link.json.link.target_url -ne $target) { throw "target mismatch" }
Write-Host "OK link $($link.json.link.tracking_param)"

Write-Host "=== 12-13. Link listed in GET links ==="
$list = Invoke-Json "$backend/store/affiliate/links" "GET" $aH $null
if ($list.status -ne 200) { throw "list links $($list.raw)" }
$found = @($list.json.links) | Where-Object { $_.id -eq $link.json.link.id } | Select-Object -First 1
if (-not $found) { throw "promoted link missing from Mijn links API" }
Write-Host "OK mijn links contains product link"

Write-Host "=== Product detail UI route ==="
$pd = curl.exe -s -o NUL -w "%{http_code}" "$web/affiliate/dashboard/products/$productId"
if ($pd -notin @("200","307","308")) { throw "product detail UI $pd" }
Write-Host "OK product detail UI"

Write-Host "OK F2/F3 affiliate portal e2e passed affiliate=$affiliateId product=$productId"
