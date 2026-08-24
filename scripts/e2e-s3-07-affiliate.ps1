# S3-00-02 + S3-07-00..03 Affiliate — run: powershell -File scripts/e2e-s3-07-affiliate.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$web = "http://localhost:3000"
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
    # PS 5.1 reads the HTTP body into ErrorDetails and leaves GetResponseStream() empty.
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

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="REDACTED_ADMIN_PASSWORD" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-aff-$ts@example.com"
$aEmail = "affiliate-$ts@example.com"
$bEmail = "buyer-aff-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$aToken = New-Customer $aEmail "Affiliate"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner product + offer ==="
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Aff Retail $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="AffProd $ts"; description="AffProd $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://aff-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
$productId = $create.json.product_id
$versionId = $create.json.version_id
$identifierId = $create.json.identifier_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=20; base_price=100; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($offer.status -notin 200,201) { throw "offer $($offer.raw)" }
$offerId = $offer.json.offer_id

Write-Host "=== Affiliate register + approve ==="
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/europmade-$ts"
  legal_name="Aff Co $ts"
  iban="NL91ABNA0417164300"
  country_code="NL"
  chamber_of_commerce_number=("{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999))
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "register affiliate $($regAff.raw)" }
$affiliateId = $regAff.json.affiliate.id
if ($regAff.json.affiliate.onboarding_status -ne "Ingediend") { throw "expected Ingediend" }

$getAff = Invoke-Json "$backend/store/affiliate" "GET" $aH $null
if ($getAff.status -ne 200 -or $getAff.json.affiliate.id -ne $affiliateId) { throw "get affiliate $($getAff.raw)" }

$listPending = Invoke-Json "$backend/admin/affiliates?status=Ingediend" "GET" $adminH $null
if ($listPending.status -ne 200) { throw "admin list $($listPending.raw)" }
$hit = @($listPending.json.affiliates) | Where-Object { $_.id -eq $affiliateId } | Select-Object -First 1
if (-not $hit) { throw "affiliate not in admin list" }

$approve = Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}"
if ($approve.status -ne 200 -or $approve.json.affiliate.onboarding_status -ne "Goedgekeurd") { throw "approve $($approve.raw)" }

Write-Host "=== Link + coupon ==="
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/p/$productId" } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }
$tracking = $link.json.link.tracking_param
$couponCode = "AFF$ts"
$coupon = Invoke-Json "$backend/store/affiliate/coupons" "POST" $aH (@{ code=$couponCode } | ConvertTo-Json -Compress)
if ($coupon.status -ne 201) { throw "coupon $($coupon.raw)" }

Write-Host "=== Consent gate on click ==="
$visitor = "visitor-aff-$ts-abcdefgh"
$clickNoConsent = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitor } | ConvertTo-Json -Compress)
if ($clickNoConsent.status -lt 400) { throw "click without consent must fail" }

$consent = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitor; consent_given=$true } | ConvertTo-Json -Compress)
if ($consent.status -ne 201) { throw "consent $($consent.raw)" }

$click = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitor } | ConvertTo-Json -Compress)
if ($click.status -ne 201) { throw "click $($click.raw)" }
$clickId = $click.json.click_id
if ($click.json.attribution_days -ne 30) { throw "expected attribution_days 30 got $($click.json.attribution_days)" }

Write-Host "=== Conversion via click (buyer) ==="
$placeClick = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference="pay-aff-click-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offerId; quantity=1 })
  affiliate_click_id=$clickId
} | ConvertTo-Json -Depth 5 -Compress)
if ($placeClick.status -ne 201) { throw "place click $($placeClick.raw)" }
$orderClick = $placeClick.json.orders[0].order_id

Start-Sleep -Seconds 1
$dbConv = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select id, affiliate_id, click_id, coupon_id from aff_conversion where order_id='$orderClick';"
if (-not $dbConv) { throw "missing conversion for click order" }
if ($dbConv -notmatch $affiliateId) { throw "conversion affiliate mismatch $dbConv" }
if ($dbConv -notmatch $clickId) { throw "conversion click mismatch $dbConv" }
$dbComm = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select amount::text, percentage::text, status from commission where order_id='$orderClick' and recipient_type='Affiliate';"
if (-not $dbComm) { throw "missing commission" }
# 100 * 0.05 = 5.00
if ($dbComm -notmatch "5") { throw "expected commission ~5 got $dbComm" }
if ($dbComm -notmatch "Toegekend") { throw "expected Toegekend $dbComm" }
Write-Host "OK click conversion + commission"

Write-Host "=== Conversion via coupon (no cookie) ==="
$b2Email = "buyer-aff-cpn-$ts@example.com"
$b2Token = New-Customer $b2Email "Buyer2"
$b2H = @{ "Content-Type"="application/json"; "Authorization"="Bearer $b2Token"; "x-publishable-api-key"=$pubKey }
$placeCpn = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $b2H (@{
  payment_reference="pay-aff-cpn-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offerId; quantity=1 })
  affiliate_coupon_code=$couponCode
} | ConvertTo-Json -Depth 5 -Compress)
if ($placeCpn.status -ne 201) { throw "place coupon $($placeCpn.raw)" }
$orderCpn = $placeCpn.json.orders[0].order_id
Start-Sleep -Seconds 1
$dbCpn = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select click_id, coupon_id from aff_conversion where order_id='$orderCpn';"
if (-not $dbCpn) { throw "missing coupon conversion" }
if ($dbCpn -match "^[^|]*\|$") { throw "coupon_id empty $dbCpn" }
Write-Host "OK coupon conversion without click"

Write-Host "=== Self-attribution blocked + moderation ==="
$selfVisitor = "$visitor-self"
$consentSelf = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$selfVisitor; consent_given=$true } | ConvertTo-Json -Compress)
if ($consentSelf.status -ne 201) { throw "consent self $($consentSelf.raw)" }
$selfClick = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$selfVisitor } | ConvertTo-Json -Compress)
if ($selfClick.status -ne 201) { throw "self click $($selfClick.raw)" }
$beforeMod = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from moderation_case where case_type='Fraude-signaal';"
$placeSelf = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $aH (@{
  payment_reference="pay-aff-self-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offerId; quantity=1 })
  affiliate_click_id=$selfClick.json.click_id
} | ConvertTo-Json -Depth 5 -Compress)
if ($placeSelf.status -ne 201) { throw "place self $($placeSelf.raw)" }
$orderSelf = $placeSelf.json.orders[0].order_id
Start-Sleep -Seconds 1
$selfConv = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from aff_conversion where order_id='$orderSelf';"
if ([int]$selfConv -ne 0) { throw "self-attribution must not create conversion" }
$afterMod = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from moderation_case where case_type='Fraude-signaal';"
if ([int]$afterMod -le [int]$beforeMod) { throw "expected Fraude-signaal moderation case" }
Write-Host "OK self-attribution blocked"

Write-Host "=== Reverse on refund ==="
$orderClickObj = @($placeClick.json.orders)[0]
$orderClickId = $orderClickObj.order_id
$lineId = @($orderClickObj.line_ids)[0]
if (-not $lineId) { throw "missing line_ids in place response $($placeClick.raw)" }
# ADR-0040: buyer return is only allowed after shipment delivered_at.
$ship = Invoke-Json "$backend/store/order-service/seller/orders/$orderClickId/shipment" "POST" $rH (@{
  carrier="PostNL"; tracking_code="AFF$ts"; status="delivered"
} | ConvertTo-Json -Compress)
if ($ship.status -notin 200,201) {
  throw "shipment delivered status=$($ship.status) body=$($ship.raw)"
}
if (-not $ship.json.order.delivered_at) {
  throw "shipment did not set delivered_at status=$($ship.status) body=$($ship.raw)"
}
$retBody = @{ order_line_id = "$lineId"; reason = "Affiliate e2e return" } | ConvertTo-Json -Compress
$ret = Invoke-Json "$backend/store/order-service/returns" "POST" $bH $retBody
if ($ret.status -notin 200,201) {
  throw "return status=$($ret.status) body=$($ret.raw) line_id=$lineId order_id=$orderClickId"
}
$retId = $ret.json.return.id
$c1 = Invoke-Json "$backend/store/order-service/seller/returns/$retId/confirm" "POST" $rH "{}"
if ($c1.status -ne 200) { throw "confirm return status=$($c1.status) body=$($c1.raw)" }
$recv1 = Invoke-Json "$backend/store/order-service/seller/returns/$retId/receive" "POST" $rH "{}"
if ($recv1.status -ne 200) { throw "receive return status=$($recv1.status) body=$($recv1.raw)" }
$ap = Invoke-Json "$backend/store/order-service/seller/returns/$retId/approve" "POST" $rH "{}"
if ($ap.status -ne 200) { throw "approve return status=$($ap.status) body=$($ap.raw)" }
Start-Sleep -Seconds 2
$rev = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select reversed_at is not null from aff_conversion where order_id='$orderClick';"
if ($rev -ne "t") { throw "conversion not reversed: $rev" }
$commRev = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select status from commission where order_id='$orderClick' and recipient_type='Affiliate';"
if ($commRev -ne "Teruggedraaid") { throw "commission not reversed: $commRev" }
Write-Host "OK conversion reversed on refund"

Write-Host "=== Schema smoke ==="
$tablesRaw = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select tablename from pg_tables where schemaname='public' and tablename in ('affiliate','affiliate_link','aff_coupon','consent_record','aff_click','aff_conversion','affiliate_commission_setting','commission') order by 1;"
$tableSet = @($tablesRaw | ForEach-Object { "$_".Trim() } | Where-Object { $_ -ne "" })
foreach ($t in @("affiliate","affiliate_link","aff_click","aff_conversion","aff_coupon","affiliate_commission_setting","commission","consent_record")) {
  if ($tableSet -notcontains $t) { throw "missing table $t (have: $($tableSet -join ','))" }
}

Write-Host "OK S3-07 affiliate e2e passed affiliate=$affiliateId clickOrder=$orderClick couponOrder=$orderCpn"
