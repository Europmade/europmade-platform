# F7 Affiliate tracking — E2E hardening of existing behaviour (no new business rules)
# Run: powershell -File scripts/e2e-f7-affiliate-tracking.ps1
# Refund/reverse (G) remains in scripts/e2e-s3-07-affiliate.ps1 (delivered shipment required).
$ErrorActionPreference = "Stop"
$backend = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://127.0.0.1:9000" }
$web = if ($env:WEB_URL) { $env:WEB_URL } else { "http://127.0.0.1:3000" }
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
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $raw = $_.ErrorDetails.Message
    }
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
  $cust = Invoke-Json "$backend/store/customers" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey; "Authorization"="Bearer $($reg.json.token)" } (@{ email=$email; first_name=$roleLabel; last_name="E2E" } | ConvertTo-Json -Compress)
  if ($cust.status -notin 200,201) { throw "customer $($cust.raw)" }
  $login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($login.status -ne 200) { throw "login $($login.raw)" }
  return $login.json.token
}

function Upload-Doc($token, $docType) {
  $tmp = Join-Path $env:TEMP "e2e-$docType-$ts-$([guid]::NewGuid().ToString('N').Substring(0,6)).pdf"
  [System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
  $out = curl.exe -s -w "`n%{http_code}" -X POST "$backend/store/partner-onboarding/documents" -H "Authorization: Bearer $token" -H "x-publishable-api-key: $pubKey" -F "file=@$tmp;type=application/pdf;filename=$docType.pdf" -F "document_type=$docType"
  $code = (($out -split "`n") | Where-Object { $_ -ne "" })[-1]
  if ($code -notin @("200","201")) { throw "upload $docType failed $out" }
}

function Sql($query) {
  $raw = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c $query
  return ("$raw").Trim()
}

function Place-Order($headers, $ref, $offerId, $clickId, $couponCode) {
  $body = @{
    payment_reference = $ref
    payment_mode = "simulated"
    shipping_address = "A 1"
    billing_address = "A 1"
    lines = @(@{ offer_id = $offerId; quantity = 1 })
  }
  if ($clickId) { $body.affiliate_click_id = $clickId }
  if ($couponCode) { $body.affiliate_coupon_code = $couponCode }
  return Invoke-Json "$backend/store/order-service/checkout/place" "POST" $headers ($body | ConvertTo-Json -Depth 5 -Compress)
}

function Assert-NoLeak($label, $raw, $ids) {
  foreach ($id in $ids) {
    if (-not $id) { continue }
    if ("$raw" -match [regex]::Escape("$id")) {
      throw "$label leaked identifier $id in $($raw.Substring(0, [Math]::Min(240, "$raw".Length)))"
    }
  }
}

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

$rToken = New-Customer "ret-f7-$ts@example.com" "Retailer"
$aToken = New-Customer "aff-f7-a-$ts@example.com" "AffiliateA"
$bToken = New-Customer "aff-f7-b-$ts@example.com" "AffiliateB"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$bAffH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner product + offer ==="
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="F7 Retail $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="F7Prod $ts"; description="F7Prod $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://f7-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
$productId = $create.json.product_id
$versionId = $create.json.version_id
$identifierId = $create.json.identifier_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=40; base_price=100; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($offer.status -notin 200,201) { throw "offer $($offer.raw)" }
$offerId = $offer.json.offer_id

function Register-ApprovedAffiliate($headers, $label) {
  $regAff = Invoke-Json "$backend/store/affiliate" "POST" $headers (@{
    channel_url="https://blog.example.com/f7-$label-$ts"
    legal_name="F7 $label $ts"
    iban="NL91ABNA0417164300"
    country_code="NL"
    chamber_of_commerce_number=("{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999))
  } | ConvertTo-Json -Compress)
  if ($regAff.status -ne 201) { throw "register affiliate $label $($regAff.raw)" }
  $id = $regAff.json.affiliate.id
  $approve = Invoke-Json "$backend/admin/affiliates/$id/approve" "POST" $adminH "{}"
  if ($approve.status -ne 200) { throw "approve $label $($approve.raw)" }
  return $id
}

$affiliateAId = Register-ApprovedAffiliate $aH "A"
$affiliateBId = Register-ApprovedAffiliate $bAffH "B"

$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/product/$productId" } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }
$linkAId = $link.json.link.id
$tracking = $link.json.link.tracking_param
$couponCode = "F7C$ts"
$coupon = Invoke-Json "$backend/store/affiliate/coupons" "POST" $aH (@{ code=$couponCode } | ConvertTo-Json -Compress)
if ($coupon.status -ne 201) { throw "coupon $($coupon.raw)" }
$couponId = $coupon.json.coupon.id

function New-Click($visitorKey, $trackingParam) {
  $consent = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitorKey; consent_given=$true } | ConvertTo-Json -Compress)
  if ($consent.status -ne 201) { throw "consent $($consent.raw)" }
  $click = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$trackingParam; visitor_key=$visitorKey } | ConvertTo-Json -Compress)
  if ($click.status -ne 201) { throw "click $($click.raw)" }
  return $click.json.click_id
}

# --- A. Expired click -------------------------------------------------------
Write-Host "=== A. Expired click ==="
$buyerExp = New-Customer "buy-f7-exp-$ts@example.com" "BuyerExp"
$expH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $buyerExp"; "x-publishable-api-key"=$pubKey }
$expiredClickId = New-Click "f7-exp-$ts-abcdefgh" $tracking
$sqlClick = $expiredClickId.Replace("'", "''")
Sql "update aff_click set attribution_expires_at = now() - interval '1 hour' where id = '$sqlClick';" | Out-Null
$expCheck = Sql "select attribution_expires_at < now() from aff_click where id = '$sqlClick';"
if ($expCheck -ne "t") { throw "click was not expired in fixture $expCheck" }
$placeExp = Place-Order $expH "pay-f7-exp-$ts" $offerId $expiredClickId $null
if ($placeExp.status -ne 201) { throw "expired place must succeed $($placeExp.status) $($placeExp.raw)" }
$orderExp = $placeExp.json.orders[0].order_id
Start-Sleep -Seconds 1
$expConv = Sql "select count(*) from aff_conversion where order_id='$($orderExp.Replace("'", "''"))';"
if ([int]$expConv -ne 0) { throw "expired click must not create conversion" }
$expComm = Sql "select count(*) from commission where order_id='$($orderExp.Replace("'", "''"))' and recipient_type='Affiliate';"
if ([int]$expComm -ne 0) { throw "expired click must not create affiliate commission" }
Write-Host "OK expired click: order placed, no conversion/commission"

# --- B. Multiple clicks (last successful click / em_aff_clk overwrite) ------
Write-Host "=== B. Multiple clicks (last cookie wins) ==="
$buyerLast = New-Customer "buy-f7-last-$ts@example.com" "BuyerLast"
$lastH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $buyerLast"; "x-publishable-api-key"=$pubKey }
$visitorLast = "f7-last-$ts-abcdefgh"
$consentLast = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitorLast; consent_given=$true } | ConvertTo-Json -Compress)
if ($consentLast.status -ne 201) { throw "consent last $($consentLast.raw)" }
$click1 = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitorLast } | ConvertTo-Json -Compress)
if ($click1.status -ne 201) { throw "click1 $($click1.raw)" }
$click2 = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitorLast } | ConvertTo-Json -Compress)
if ($click2.status -ne 201) { throw "click2 $($click2.raw)" }
$click1Id = $click1.json.click_id
$click2Id = $click2.json.click_id
if ($click1Id -eq $click2Id) { throw "expected two distinct click ids" }
# Checkout reads em_aff_clk, which persistClickCookie overwrites on each successful click.
$placeLast = Place-Order $lastH "pay-f7-last-$ts" $offerId $click2Id $null
if ($placeLast.status -ne 201) { throw "last-click place $($placeLast.raw)" }
$orderLast = $placeLast.json.orders[0].order_id
Start-Sleep -Seconds 1
$sqlOrderLast = $orderLast.Replace("'", "''")
$dbLast = Sql "select click_id, coupon_id from aff_conversion where order_id='$sqlOrderLast';"
if (-not $dbLast) { throw "missing last-click conversion" }
if ($dbLast -notmatch [regex]::Escape($click2Id)) { throw "expected last click $click2Id got $dbLast" }
if ($dbLast -match [regex]::Escape($click1Id)) { throw "first click must not win $dbLast" }
Write-Host "OK last successful click attributed (not first-click)"

# --- C. Click + coupon: existing click-priority behaviour -------------------
Write-Host "=== C. Click + coupon (click priority) ==="
$buyerBoth = New-Customer "buy-f7-both-$ts@example.com" "BuyerBoth"
$bothH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $buyerBoth"; "x-publishable-api-key"=$pubKey }
$clickBothId = New-Click "f7-both-$ts-abcdefgh" $tracking
$placeBoth = Place-Order $bothH "pay-f7-both-$ts" $offerId $clickBothId $couponCode
if ($placeBoth.status -ne 201) { throw "click+coupon place $($placeBoth.raw)" }
$orderBoth = $placeBoth.json.orders[0].order_id
Start-Sleep -Seconds 1
$sqlOrderBoth = $orderBoth.Replace("'", "''")
$convCountBoth = Sql "select count(*) from aff_conversion where order_id='$sqlOrderBoth';"
if ([int]$convCountBoth -ne 1) { throw "expected exactly 1 conversion, got $convCountBoth" }
$dbBoth = Sql "select click_id, coupon_id from aff_conversion where order_id='$sqlOrderBoth';"
if ($dbBoth -notmatch [regex]::Escape($clickBothId)) { throw "click should win $dbBoth" }
$couponCol = ($dbBoth -split "\|", 2)[1]
if ($couponCol) { throw "coupon_id must be empty when click wins, got $dbBoth" }
Write-Host "OK click has priority over coupon; single conversion"

# --- D. Coupon reuse (ADR-0033: >3 conversions / 24h same customer+coupon) --
Write-Host "=== D. Coupon reuse ==="
$buyerReuse = New-Customer "buy-f7-reuse-$ts@example.com" "BuyerReuse"
$reuseH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $buyerReuse"; "x-publishable-api-key"=$pubKey }
$reuseOrders = @()
for ($i = 1; $i -le 3; $i++) {
  $placed = Place-Order $reuseH "pay-f7-reuse-$ts-$i" $offerId $null $couponCode
  if ($placed.status -ne 201) { throw "reuse place $i $($placed.raw)" }
  $reuseOrders += $placed.json.orders[0].order_id
  Start-Sleep -Seconds 1
  $ok = Sql "select count(*) from aff_conversion where order_id='$($placed.json.orders[0].order_id.Replace("'", "''"))';"
  if ([int]$ok -ne 1) { throw "reuse conversion $i missing" }
}
$beforeReuse = Sql "select count(*) from moderation_case where signal_code='coupon_reuse';"
$place4 = Place-Order $reuseH "pay-f7-reuse-$ts-4" $offerId $null $couponCode
if ($place4.status -ne 201) { throw "4th coupon order must still place $($place4.raw)" }
$order4 = $place4.json.orders[0].order_id
Start-Sleep -Seconds 1
$conv4 = Sql "select count(*) from aff_conversion where order_id='$($order4.Replace("'", "''"))';"
if ([int]$conv4 -ne 0) { throw "4th coupon conversion must be blocked" }
$afterReuse = Sql "select count(*) from moderation_case where signal_code='coupon_reuse';"
if ([int]$afterReuse -le [int]$beforeReuse) { throw "expected coupon_reuse moderation case" }
$couponStatus = Sql "select status from aff_coupon where id='$($couponId.Replace("'", "''"))';"
if ($couponStatus -ne "Actief") { throw "coupon must stay Actief, got $couponStatus" }
Write-Host "OK coupon_reuse blocked 4th conversion; coupon still Actief"

# --- E. Affiliate-wide click velocity (ADR-0032: >=50 / 24h, not same-link) -
Write-Host "=== E. Affiliate velocity ==="
$velVisitor = "f7-vel-$ts-abcdefgh"
$velConsent = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$velVisitor; consent_given=$true } | ConvertTo-Json -Compress)
if ($velConsent.status -ne 201) { throw "velocity consent $($velConsent.raw)" }
# Per-link limit is 20/hour; spread 50 clicks across 3 links (19+19+12).
$velCounts = @(19, 19, 12)
$velTracking = @()
for ($li = 0; $li -lt 3; $li++) {
  $vl = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/product/$productId?vel=$li" } | ConvertTo-Json -Compress)
  if ($vl.status -ne 201) { throw "velocity link $li $($vl.raw)" }
  $tp = $vl.json.link.tracking_param
  $velTracking += $tp
  for ($cj = 0; $cj -lt $velCounts[$li]; $cj++) {
    $cr = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tp; visitor_key=$velVisitor } | ConvertTo-Json -Compress)
    if ($cr.status -ne 201) { throw "velocity click $li/$cj $($cr.status) $($cr.raw)" }
  }
}
$beforeVel = Sql "select count(*) from moderation_case where signal_code='click_velocity_affiliate';"
$blockedVel = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$velTracking[0]; visitor_key=$velVisitor } | ConvertTo-Json -Compress)
if ($blockedVel.status -lt 400) { throw "51st affiliate-wide click must be blocked, got $($blockedVel.status)" }
$afterVel = Sql "select count(*) from moderation_case where signal_code='click_velocity_affiliate';"
if ([int]$afterVel -le [int]$beforeVel) { throw "expected click_velocity_affiliate moderation case" }
Write-Host "OK affiliate velocity blocked at >=50 / 24h"

# --- F. Ownership / IDOR ----------------------------------------------------
Write-Host "=== F. Affiliate ownership ==="
Start-Sleep -Seconds 1
$aLinks = Invoke-Json "$backend/store/affiliate/links" "GET" $aH $null
$aDash = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $aH $null
$aStats = Invoke-Json "$backend/store/affiliate/stats" "GET" $aH $null
$aComm = Invoke-Json "$backend/store/affiliate/commissions" "GET" $aH $null
$aPay = Invoke-Json "$backend/store/finance/affiliate/payouts" "GET" $aH $null
if ($aLinks.status -ne 200) { throw "A links $($aLinks.raw)" }
if ($aDash.status -ne 200) { throw "A dashboard $($aDash.raw)" }
if ($aComm.status -ne 200) { throw "A commissions $($aComm.raw)" }
if ($aPay.status -ne 200) { throw "A payouts $($aPay.raw)" }
$aLinkIds = @($aLinks.json.links | ForEach-Object { $_.id })
if ($aLinkIds -notcontains $linkAId) { throw "A must see own link" }
$aOrderIds = @($aComm.json.commissions | ForEach-Object { $_.order_id })
if ($aOrderIds -notcontains $orderLast) { throw "A must see own commission for last-click order" }
$aPayoutIds = @($aPay.json.payouts | ForEach-Object { $_.id })
$aPayoutForLast = @($aPay.json.payouts | Where-Object { $_.order_id -eq $orderLast } | Select-Object -First 1)
if (-not $aPayoutForLast) { throw "A missing payout for last-click order" }

$bLinks = Invoke-Json "$backend/store/affiliate/links" "GET" $bAffH $null
$bDash = Invoke-Json "$backend/store/affiliate/dashboard" "GET" $bAffH $null
$bStats = Invoke-Json "$backend/store/affiliate/stats" "GET" $bAffH $null
$bComm = Invoke-Json "$backend/store/affiliate/commissions" "GET" $bAffH $null
$bPay = Invoke-Json "$backend/store/finance/affiliate/payouts" "GET" $bAffH $null
if ($bLinks.status -ne 200) { throw "B links $($bLinks.raw)" }
if ($bDash.status -ne 200) { throw "B dashboard $($bDash.raw)" }
if ($bStats.status -ne 200) { throw "B stats $($bStats.raw)" }
if ($bComm.status -ne 200) { throw "B commissions $($bComm.raw)" }
if ($bPay.status -ne 200) { throw "B payouts $($bPay.raw)" }
if ($bDash.json.affiliate.id -ne $affiliateBId) { throw "B dashboard must be scoped to B" }
if ([int]$bDash.json.kpis.conversions -ne 0) { throw "B dashboard must not include A conversions" }

$forbidden = @($affiliateAId, $linkAId, $tracking, $orderLast, $orderBoth, $aPayoutForLast.id)
foreach ($c in @($aComm.json.commissions)) { $forbidden += $c.id }
foreach ($p in $aPayoutIds) { $forbidden += $p }
Assert-NoLeak "B links" $bLinks.raw $forbidden
Assert-NoLeak "B dashboard" $bDash.raw $forbidden
Assert-NoLeak "B stats" $bStats.raw $forbidden
Assert-NoLeak "B commissions" $bComm.raw $forbidden
Assert-NoLeak "B payouts" $bPay.raw $forbidden
Write-Host "OK affiliate B cannot read A links/dashboard/commissions/payouts"

Write-Host "OK F7 affiliate tracking e2e passed A=$affiliateAId lastOrder=$orderLast"
Write-Host "G refund/reverse is covered by scripts/e2e-s3-07-affiliate.ps1 (delivered shipment required)"
