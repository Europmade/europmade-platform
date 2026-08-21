# F4 Affiliate Productdetail + Commissie-weergave
# Run: powershell -File scripts/e2e-f4-affiliate-product-detail.ps1
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

function Round-Money([double]$n) {
  return [math]::Round($n, 2, [System.MidpointRounding]::AwayFromZero)
}

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }
Write-Host "OK health"

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$aEmail = "aff-f4-$ts@example.com"
$aToken = New-Customer $aEmail "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/f4-$ts"
  legal_name="F4 Aff $ts"
  iban="NL91ABNA0417164300"
  country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "affiliate register $($regAff.raw)" }
$affiliateId = $regAff.json.affiliate.id

Write-Host "=== Non-approved blocked ==="
$dashBlocked = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
if ($dashBlocked.status -lt 400) { throw "dashboard before approve must fail" }
$settingsBlocked = Invoke-Json "$backend/store/affiliate/commission-settings" "GET" $aH $null
if ($settingsBlocked.status -lt 400) { throw "commission-settings before approve must fail" }
$linksBlocked = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/product/x" } | ConvertTo-Json -Compress)
if ($linksBlocked.status -lt 400) { throw "links before approve must fail" }
Write-Host "OK non-approved gate"

Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}" | Out-Null

Write-Host "=== Catalog sellable product ==="
$catalog = Invoke-Json "$backend/store/catalog/products?limit=24&region_code=NL" "GET" $pubH $null
if ($catalog.status -ne 200) { throw "catalog $($catalog.raw)" }
$sellable = @($catalog.json.products) | Where-Object { $_.offer_count -gt 0 -and $null -ne $_.from_price }
if ($sellable.Count -lt 1) { throw "need a sellable catalog product" }
$product = $sellable[0]
$productId = $product.id
if (-not $product.title) { throw "catalog product missing title" }
Write-Host "OK catalog product=$productId title=$($product.title)"

Write-Host "=== Product detail API ==="
$detail = Invoke-Json "$backend/store/catalog/products/$productId`?region_code=NL" "GET" $pubH $null
if ($detail.status -ne 200) { throw "catalog detail $($detail.raw)" }
if ($detail.json.product.id -ne $productId) { throw "detail id mismatch" }
if (-not $detail.json.product.title) { throw "detail missing title" }
$winner = @($detail.json.offers) | Where-Object { $_.is_winner } | Select-Object -First 1
if (-not $winner) { $winner = @($detail.json.offers) | Select-Object -First 1 }
if (-not $winner) { throw "detail has no offers, product not sellable" }
$unitPrice = [double]$winner.base_price
Write-Host "OK product detail title=$($detail.json.product.title) price=$unitPrice"

Write-Host "=== Commission settings (not hardcoded) ==="
$settings = Invoke-Json "$backend/store/affiliate/commission-settings" "GET" $aH $null
if ($settings.status -ne 200) { throw "commission-settings $($settings.raw)" }
if ([double]$settings.json.percentage -ne 0.05) { throw "expected 5% got $($settings.json.percentage)" }
if ($settings.json.percentage_display -ne "5%") { throw "display $($settings.json.percentage_display)" }
if ([int]$settings.json.attribution_days -ne 30) { throw "expected 30 days" }
$expectedEarn = Round-Money ($unitPrice * [double]$settings.json.percentage)
Write-Host "OK commission $($settings.json.percentage_display) attribution=$($settings.json.attribution_days)d earn=$expectedEarn"

Write-Host "=== Promote via existing links API ==="
$target = "/product/$productId"
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url=$target } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "create link $($link.raw)" }
if ($link.json.link.target_url -ne $target) { throw "target must be /product/{productId} got $($link.json.link.target_url)" }
if ($link.json.link.target_url -match "/product/.+/.+") { throw "must not use slug path $($link.json.link.target_url)" }
$tracking = $link.json.link.tracking_param
if (-not $tracking) { throw "missing tracking_param" }
$share = "$web$target`?ref=$tracking"
if ($share -notmatch [regex]::Escape("ref=$tracking")) { throw "share URL missing ref" }
Write-Host "OK promote link=$share"

$list = Invoke-Json "$backend/store/affiliate/links" "GET" $aH $null
$found = @($list.json.links) | Where-Object { $_.id -eq $link.json.link.id } | Select-Object -First 1
if (-not $found) { throw "generated link missing from Mijn links" }
Write-Host "OK link listed for copy/share"

Write-Host "=== UI routes ==="
$productsUi = curl.exe -s -o NUL -w "%{http_code}" "$web/affiliate/dashboard/products"
if ($productsUi -notin @("200","307","308")) { throw "products UI $productsUi" }
$detailUi = curl.exe -s -o NUL -w "%{http_code}" "$web/affiliate/dashboard/products/$productId"
if ($detailUi -notin @("200","307","308")) { throw "product detail UI $detailUi" }
$srcDetail = Get-Content -LiteralPath (Join-Path $PSScriptRoot "../apps/web/app/affiliate/dashboard/products/[id]/page.tsx") -Raw
$srcList = Get-Content -LiteralPath (Join-Path $PSScriptRoot "../apps/web/app/affiliate/dashboard/products/page.tsx") -Raw
$srcMessages = Get-Content -LiteralPath (Join-Path $PSScriptRoot "../apps/web/app/_lib/i18n/messages.ts") -Raw
$srcBlob = "$srcDetail`n$srcList`n$srcMessages"
if ($srcBlob -notmatch "Promoot dit product") { throw "UI missing Promoot dit product" }
if ($srcBlob -notmatch "Affiliate commissie") { throw "UI missing Affiliate commissie" }
if ($srcBlob -notmatch "Kopieer link") { throw "UI missing Kopieer link" }
if ($srcBlob -notmatch "Je verdient") { throw "UI missing Je verdient" }
if ($srcBlob -notmatch "Attributieduur") { throw "UI missing Attributieduur" }
if ($srcList -notmatch [regex]::Escape("/affiliate/dashboard/products/")) {
  throw "product overview missing detail links"
}
Write-Host "OK UI product overview + detail"

Write-Host "OK F4 affiliate product detail e2e passed affiliate=$affiliateId product=$productId earn=$expectedEarn"
