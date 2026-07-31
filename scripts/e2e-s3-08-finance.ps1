# S3-08-01..04 Finance — run: powershell -File scripts/e2e-s3-08-finance.ps1
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

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-fin-$ts@example.com"
$aEmail = "affiliate-fin-$ts@example.com"
$bEmail = "buyer-fin-$ts@example.com"
Write-Host "=== Register retailer / affiliate / buyer ==="
$rToken = New-Customer $rEmail "Retailer"
$aToken = New-Customer $aEmail "Affiliate"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner onboard + approve ==="
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Fin Retail $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
$approve = Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}"
if ($approve.status -ne 200) { throw "approve partner $($approve.raw)" }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="FinProd $ts"; description="FinProd $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://fin-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
if ($create.status -ne 201) { throw "create product $($create.raw)" }
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

Write-Host "=== Affiliate register + approve + consent + click ==="
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/fin-$ts"; legal_name="Fin Aff $ts"
  iban="NL91ABNA0417164300"; country_code="NL"
  chamber_of_commerce_number=("{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999))
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "aff reg $($regAff.raw)" }
$affId = $regAff.json.affiliate.id
$apprAff = Invoke-Json "$backend/admin/affiliates/$affId/approve" "POST" $adminH "{}"
if ($apprAff.status -ne 200) { throw "aff approve $($apprAff.raw)" }
$visitor = "visitor-fin-$ts-abcdefgh"
$consent = Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{
  visitor_key=$visitor; consent_given=$true
} | ConvertTo-Json -Compress)
if ($consent.status -ne 201) { throw "consent $($consent.raw)" }
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{
  target_url="/p/$productId"
} | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }
$click = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{
  tracking_param=$link.json.link.tracking_param; visitor_key=$visitor
} | ConvertTo-Json -Compress)
if ($click.status -ne 201) { throw "click $($click.raw)" }
$clickId = $click.json.click_id

Write-Host "=== Place order with affiliate click ==="
$payRef = "pay-fin-$ts"
$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference=$payRef; payment_mode="simulated"
  shipping_address="Kalverstraat 1, 1012 NX Amsterdam"
  billing_address="Kalverstraat 1, 1012 NX Amsterdam"
  lines=@(@{ offer_id=$offerId; quantity=1 })
  affiliate_click_id=$clickId
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }
$orderId = $place.json.orders[0].order_id
$lineId = $place.json.orders[0].line_ids[0]

Write-Host "=== Seller finance overview ==="
$fin = Invoke-Json "$backend/store/finance/seller" "GET" $rH $null
if ($fin.status -ne 200) { throw "seller finance $($fin.raw)" }
if ($fin.json.commissions.Count -lt 1) { throw "expected platform commission $($fin.raw)" }
$comm = $fin.json.commissions | Where-Object { $_.order_id -eq $orderId } | Select-Object -First 1
if (-not $comm) { throw "no commission for order" }
# Line snapshot = base_price(100) + shipping(5) = 105; platform 10% = 10.5
if ([math]::Abs([double]$comm.amount - 10.5) -gt 0.001) { throw "expected 10% of 105 = 10.5, got $($comm.amount)" }
if ([double]$comm.percentage -ne 0.1) { throw "expected percentage 0.1" }

$klant = @($fin.json.invoices | Where-Object { $_.invoice_type -eq "Klant-factuur" -and $_.order_id -eq $orderId -and -not $_.credit_of_invoice_id })
if ($klant.Count -lt 1) { throw "missing Klant-factuur" }
$sellerInv = @($fin.json.invoices | Where-Object { $_.invoice_type -eq "Seller-commissiefactuur" -and $_.order_id -eq $orderId })
if ($sellerInv.Count -lt 1) { throw "missing Seller-commissiefactuur" }
if (-not $klant[0].vat_breakdown.totals) { throw "missing vat_breakdown.totals" }

$payout = @($fin.json.payouts | Where-Object { $_.order_id -eq $orderId })
if ($payout.Count -lt 1) { throw "missing seller payout" }
if ($payout[0].status -ne "Gepland") { throw "payout should be Gepland" }
if ([math]::Abs([double]$payout[0].amount - 94.5) -gt 0.001) { throw "expected net 94.5, got $($payout[0].amount)" }
$payoutId = $payout[0].id

Write-Host "=== Affiliate payouts ==="
$affPay = Invoke-Json "$backend/store/finance/affiliate/payouts" "GET" $aH $null
if ($affPay.status -ne 200) { throw "aff payouts $($affPay.raw)" }
$ap = @($affPay.json.payouts | Where-Object { $_.order_id -eq $orderId })
if ($ap.Count -lt 1) { throw "missing affiliate payout" }
if ($ap[0].status -ne "Gepland") { throw "aff payout not Gepland" }
if ([math]::Abs([double]$ap[0].amount - 5.25) -gt 0.001) { throw "expected aff 5% of 105 = 5.25, got $($ap[0].amount)" }

Write-Host "=== Admin payout list + hold enforcement ==="
$adminList = Invoke-Json "$backend/admin/finance/payouts?status=Gepland" "GET" $adminH $null
if ($adminList.status -ne 200) { throw "admin payouts $($adminList.raw)" }
$blocked = Invoke-Json "$backend/admin/finance/payouts/$payoutId/process" "POST" $adminH "{}"
if ($blocked.status -eq 200) { throw "process must fail inside return window" }
Write-Host "hold_ok status=$($blocked.status)"

Write-Host "=== Force eligible_at then process ==="
docker exec europmade-postgres psql -U europmade -d europmade -c "update payout set eligible_at = now() - interval '1 hour' where id = '$payoutId';" | Out-Null
$processed = Invoke-Json "$backend/admin/finance/payouts/$payoutId/process" "POST" $adminH "{}"
if ($processed.status -ne 200) { throw "process $($processed.raw)" }
if (-not $processed.json.stripe_transfer_id) { throw "missing stub transfer id" }

Write-Host "=== Refund -> creditnota + cancel Gepland affiliate payout ==="
$req = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId; reason="E2E finance refund" } | ConvertTo-Json -Compress)
if ($req.status -ne 201) { throw "return request $($req.raw)" }
$returnId = $req.json.return.id
$c1 = Invoke-Json "$backend/store/order-service/seller/returns/$returnId/confirm" "POST" $rH "{}"
if ($c1.status -ne 200) { throw "confirm $($c1.raw)" }
$recv1 = Invoke-Json "$backend/store/order-service/seller/returns/$returnId/receive" "POST" $rH "{}"
if ($recv1.status -ne 200) { throw "receive $($recv1.raw)" }
$ap1 = Invoke-Json "$backend/store/order-service/seller/returns/$returnId/approve" "POST" $rH "{}"
if ($ap1.status -ne 200) { throw "approve return $($ap1.raw)" }

Start-Sleep -Seconds 2
$fin2 = Invoke-Json "$backend/store/finance/seller" "GET" $rH $null
$credits = @($fin2.json.invoices | Where-Object { $_.credit_of_invoice_id -eq $klant[0].id })
if ($credits.Count -lt 1) { throw "expected creditnota after refund $($fin2.raw)" }
$platformAfter = @($fin2.json.commissions | Where-Object { $_.order_id -eq $orderId })
$reversed = @($platformAfter | Where-Object { $_.status -eq "Teruggedraaid" })
if ($reversed.Count -lt 1) { throw "expected platform commission Teruggedraaid" }

$affPay2 = Invoke-Json "$backend/store/finance/affiliate/payouts" "GET" $aH $null
$ap2 = @($affPay2.json.payouts | Where-Object { $_.order_id -eq $orderId })
if ($ap2.Count -lt 1) { throw "missing affiliate payout after refund" }
if ($ap2[0].status -ne "Geannuleerd") { throw "affiliate payout should be Geannuleerd after refund, got $($ap2[0].status)" }

Write-Host "=== Schema check ==="
$tables = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select tablename from pg_tables where schemaname='public' and tablename in ('invoice','payout','commission') order by 1;"
foreach ($t in @("commission","invoice","payout")) {
  if ($tables -notcontains $t) { throw "missing table $t" }
}

Write-Host "PASS e2e-s3-08-finance order=$orderId payout=$payoutId"
