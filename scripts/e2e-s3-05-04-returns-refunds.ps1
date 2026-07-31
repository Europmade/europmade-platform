# S3-05-04 Retouren & Refunds — run: powershell -File scripts/e2e-s3-05-04-returns-refunds.ps1
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

function Onboard-Partner($token, $isRetailer, $isProducer, $companyName) {
  $kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
  $vat = "NL{0}B01" -f (Get-Random -Minimum 100000000 -Maximum 999999999)
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $start = Invoke-Json "$backend/store/partner-onboarding" "POST" $h (@{ is_retailer=$isRetailer; is_producer_or_brand_owner=$isProducer; is_distributor=$false } | ConvertTo-Json -Compress)
  if ($start.status -notin 200,201) { throw "start $($start.raw)" }
  $patchJson = @{
    is_retailer=$isRetailer; is_producer_or_brand_owner=$isProducer; is_distributor=$false
    company=@{ legal_name=$companyName; chamber_of_commerce_number=$kvk; vat_number=$vat; country_code="NL"; iban="NL91ABNA0417164300" }
  } | ConvertTo-Json -Depth 5 -Compress
  $patch = Invoke-Json "$backend/store/partner-onboarding" "PATCH" $h $patchJson
  if ($patch.status -ne 200) { throw "patch $($patch.status) $($patch.raw)" }
  Upload-Doc $token "identity_document"
  Upload-Doc $token "chamber_of_commerce_extract"
  if ($isProducer) { Upload-Doc $token "production_proof" }
  $submit = Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $h (@{ accepted_terms=$true } | ConvertTo-Json -Compress)
  if ($submit.status -notin 200,201) { throw "submit $($submit.raw)" }
  $me = Invoke-Json "$backend/store/partner-onboarding" "GET" $h $null
  return $me.json.onboarding
}

function Place-Order($buyerH, $offerId, $qty, $payRef) {
  $place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $buyerH (@{
    payment_reference=$payRef; payment_mode="simulated"
    shipping_address="Keizersgracht 1, 1015 AA Amsterdam"; billing_address="Keizersgracht 1, 1015 AA Amsterdam"
    delivery_country="NL"
    lines=@(@{ offer_id=$offerId; quantity=$qty })
  } | ConvertTo-Json -Depth 5 -Compress)
  if ($place.status -ne 201) { throw "place $($place.status) $($place.raw)" }
  return $place.json
}

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend health $bh" }
if ($wh -ne "200") { throw "web health $wh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-ret-$ts@example.com"
$bEmail = "buyer-ret-$ts@example.com"
Write-Host "=== Register + onboard ==="
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rSeller = Onboard-Partner $rToken $true $false "Retailer Ret $ts"
$approveR = Invoke-Json "$backend/admin/partners/$($rSeller.id)/approve" "POST" $adminH "{}"
if ($approveR.status -ne 200) { throw "approve failed" }

$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
Write-Host "=== Product + offer ean=$ean ==="
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="Brand Ret"; manufacturer_id="Brand Ret"; title="Ret Product $ts"; description="Ret Product $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://ret-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
if ($create.status -ne 201) { throw "product $($create.raw)" }
$identifierId = $create.json.identifier_id
$productId = $create.json.product_id
$versionId = $create.json.version_id
$submitV = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}"
$publishV = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}"
if ($submitV.status -ne 200 -or $publishV.status -ne 200) { throw "publish failed" }

$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=20
  base_price=49.99; shipping_cost=4.95; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($offer.status -ne 201) { throw "offer $($offer.raw)" }
$offerId = $offer.json.offer_id

Write-Host "=== Place orders (happy + reject + force + cooling-off) ==="
$placed1 = Place-Order $bH $offerId 1 "pay-ret-happy-$ts"
$orderId1 = $placed1.orders[0].order_id
$lineId1 = $placed1.orders[0].line_ids[0]

$placed2 = Place-Order $bH $offerId 1 "pay-ret-reject-$ts"
$lineId2 = $placed2.orders[0].line_ids[0]

$placed3 = Place-Order $bH $offerId 1 "pay-ret-force-$ts"
$lineId3 = $placed3.orders[0].line_ids[0]

$placed4 = Place-Order $bH $offerId 1 "pay-ret-cool-$ts"
$orderId4 = $placed4.orders[0].order_id
$lineId4 = $placed4.orders[0].line_ids[0]

Write-Host "=== Happy path: Aangevraagd→Bevestigd→Ontvangen→Verwerkt ==="
$req1 = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId1; reason="Past niet" } | ConvertTo-Json -Compress)
if ($req1.status -ne 201) { throw "request1 $($req1.status) $($req1.raw)" }
$ret1 = $req1.json.return.id
if ($req1.json.return.status -notmatch '^Aangevraagd$') { throw "expected Aangevraagd got $($req1.json.return.status)" }

$earlyApprove = Invoke-Json "$backend/store/order-service/seller/returns/$ret1/approve" "POST" $rH "{}"
if ($earlyApprove.status -lt 400) { throw "approve before Ontvangen must fail" }

$c1 = Invoke-Json "$backend/store/order-service/seller/returns/$ret1/confirm" "POST" $rH "{}"
if ($c1.status -ne 200 -or $c1.json.return.status -notmatch '^Bevestigd$') { throw "confirm $($c1.raw)" }
$recv1 = Invoke-Json "$backend/store/order-service/seller/returns/$ret1/receive" "POST" $rH "{}"
if ($recv1.status -ne 200 -or $recv1.json.return.status -notmatch '^Ontvangen$') { throw "receive $($recv1.raw)" }
$ap1 = Invoke-Json "$backend/store/order-service/seller/returns/$ret1/approve" "POST" $rH "{}"
if ($ap1.status -ne 200) { throw "approve $($ap1.raw)" }
if ($ap1.json.return.status -notmatch '^Verwerkt$') { throw "expected Verwerkt" }
if ($ap1.json.return.refund_status -notmatch '^Uitgevoerd$') { throw "expected refund Uitgevoerd" }
if (-not $ap1.json.return.refund_reference) { throw "missing refund_reference" }

Write-Host "=== Reject + escalate + admin force ==="
$req2 = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId2; reason="Verkeerd product" } | ConvertTo-Json -Compress)
if ($req2.status -ne 201) { throw "request2 $($req2.raw)" }
$ret2 = $req2.json.return.id
$rej = Invoke-Json "$backend/store/order-service/seller/returns/$ret2/reject" "POST" $rH (@{ decision_reason="Gebruikt / beschadigd" } | ConvertTo-Json -Compress)
if ($rej.status -ne 200 -or $rej.json.return.status -notmatch 'gewezen') { throw "reject $($rej.raw)" }
$esc = Invoke-Json "$backend/store/order-service/returns/$ret2/escalate" "POST" $bH "{}"
if ($esc.status -ne 200 -or $esc.json.return.status -notmatch 'scaleerd') { throw "escalate status=$($esc.json.return.status)" }

$req3 = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId3; reason="Te laat geleverd" } | ConvertTo-Json -Compress)
if ($req3.status -ne 201) { throw "request3 $($req3.raw)" }
$ret3 = $req3.json.return.id
$forceBad = Invoke-Json "$backend/admin/order-service/returns/$ret3/force-refund" "POST" $adminH (@{ force_reason="x" } | ConvertTo-Json -Compress)
if ($forceBad.status -lt 400) { throw "short force_reason must fail" }
$force = Invoke-Json "$backend/admin/order-service/returns/$ret3/force-refund" "POST" $adminH (@{ force_reason="Geschil beslecht ten gunste van klant" } | ConvertTo-Json -Compress)
if ($force.status -ne 200) { throw "force $($force.raw)" }
if ($force.json.return.status -notmatch '^Verwerkt$') { throw "force status" }
if ($force.json.return.refund_status -notmatch '^Geforceerd$') { throw "force refund_status" }
if (-not $force.json.return.force_reason) { throw "missing force_reason" }

Write-Host "=== Cooling-off expired ==="
docker exec europmade-postgres psql -U europmade -d europmade -c "UPDATE em_order SET created_at = NOW() - INTERVAL '20 days' WHERE id = '$orderId4';" | Out-Null
$cool = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId4; reason="Te laat" } | ConvertTo-Json -Compress)
if ($cool.status -lt 400) { throw "cooling-off must reject, got $($cool.status) $($cool.raw)" }

Write-Host "=== Lists + detail ==="
$buyerList = Invoke-Json "$backend/store/order-service/returns" "GET" $bH $null
if ($buyerList.status -ne 200 -or $buyerList.json.returns.Count -lt 3) { throw "buyer list $($buyerList.raw)" }
$sellerList = Invoke-Json "$backend/store/order-service/seller/returns" "GET" $rH $null
if ($sellerList.status -ne 200 -or $sellerList.json.returns.Count -lt 3) { throw "seller list $($sellerList.raw)" }
$adminList = Invoke-Json "$backend/admin/order-service/returns" "GET" $adminH $null
if ($adminList.status -ne 200 -or $adminList.json.returns.Count -lt 3) { throw "admin list $($adminList.raw)" }
$detail = Invoke-Json "$backend/store/order-service/returns/$ret1" "GET" $bH $null
if ($detail.status -ne 200 -or $detail.json.return.id -ne $ret1) { throw "detail $($detail.raw)" }

Write-Host "=== Duplicate open return blocked ==="
$dup = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId1; reason="Nog een keer" } | ConvertTo-Json -Compress)
# line1 is Verwerkt — open check allows new return after Verwerkt; that's OK per MVP (one OPEN). Re-request after Verwerkt is allowed by code.
# Instead block duplicate while Aangevraagd: create fresh order
$placed5 = Place-Order $bH $offerId 1 "pay-ret-dup-$ts"
$lineId5 = $placed5.orders[0].line_ids[0]
$d1 = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId5; reason="Eerste" } | ConvertTo-Json -Compress)
if ($d1.status -ne 201) { throw "dup first $($d1.raw)" }
$d2 = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId5; reason="Tweede" } | ConvertTo-Json -Compress)
if ($d2.status -lt 400) { throw "duplicate open return must fail" }

Write-Host "=== Login regression ==="
$loginB = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$bEmail; password=$pass } | ConvertTo-Json -Compress)
if ($loginB.status -ne 200) { throw "re-login buyer failed" }

Write-Host "OK S3-05-04 returns/refunds e2e passed order=$orderId1 ret=$ret1"
