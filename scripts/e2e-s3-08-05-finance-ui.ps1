# S3-08-05 Seller Finance UI — run: powershell -File scripts/e2e-s3-08-05-finance-ui.ps1
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

Write-Host "=== Register/login regression ==="
$probe = "fin-ui-auth-$ts@example.com"
$reg = Invoke-Json "$backend/auth/customer/emailpass/register" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probe; password=$pass } | ConvertTo-Json -Compress)
if ($reg.status -notin 200,201) { throw "auth register $($reg.raw)" }
$login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probe; password=$pass } | ConvertTo-Json -Compress)
if ($login.status -ne 200) { throw "auth login $($login.raw)" }

Write-Host "=== Finance UI routes ==="
foreach ($p in @(
  "/seller/finance",
  "/seller/finance/commissie",
  "/seller/finance/uitbetalingen",
  "/seller/finance/facturen",
  "/seller/finance/btw"
)) {
  $c = curl.exe -s -o NUL -w "%{http_code}" "$web$p"
  if ($c -ne "200") { throw "UI $p -> $c" }
  Write-Host "OK UI $p"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-finui-$ts@example.com"
$bEmail = "buyer-finui-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner + product + order ==="
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="FinUI Retail $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
$approve = Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}"
if ($approve.status -ne 200) { throw "approve $($approve.raw)" }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="FinUI $ts"; description="FinUI $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://finui-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
if ($create.status -ne 201) { throw "product $($create.raw)" }
Invoke-Json "$backend/store/product-cloud/products/$($create.json.product_id)/versions/$($create.json.version_id)/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$($create.json.product_id)/versions/$($create.json.version_id)/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$create.json.identifier_id; region_code="NL"; quantity_available=10
  base_price=100; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($offer.status -notin 200,201) { throw "offer $($offer.raw)" }

$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference="pay-finui-$ts"; payment_mode="simulated"
  shipping_address="Kalverstraat 1, 1012 NX Amsterdam, NL"
  billing_address="Kalverstraat 1, 1012 NX Amsterdam, NL"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=1 })
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }
$orderId = $place.json.orders[0].order_id

Write-Host "=== Seller finance overview enriched ==="
Start-Sleep -Seconds 1
$fin = Invoke-Json "$backend/store/finance/seller" "GET" $rH $null
if ($fin.status -ne 200) { throw "finance $($fin.raw)" }
if (-not $fin.json.summary) { throw "missing summary $($fin.raw)" }
if ($null -eq $fin.json.summary.net_revenue) { throw "missing net_revenue" }
if ($null -eq $fin.json.summary.commission_held) { throw "missing commission_held" }
$comm = @($fin.json.commissions | Where-Object { $_.order_id -eq $orderId })
if ($comm.Count -lt 1) { throw "missing commission row" }
if (-not $comm[0].order_number) { throw "missing order_number on commission" }
if ($null -eq $comm[0].order_subtotal) { throw "missing order_subtotal" }
if ($null -eq $comm[0].netto) { throw "missing netto" }
$klant = @($fin.json.invoices | Where-Object { $_.invoice_type -eq "Klant-factuur" -and $_.order_id -eq $orderId -and -not $_.credit_of_invoice_id })
if ($klant.Count -lt 1) { throw "missing klant invoice" }
$sellerInv = @($fin.json.invoices | Where-Object { $_.invoice_type -eq "Seller-commissiefactuur" -and $_.order_id -eq $orderId })
if ($sellerInv.Count -lt 1) { throw "missing seller invoice" }
$payout = @($fin.json.payouts | Where-Object { $_.order_id -eq $orderId })
if ($payout.Count -lt 1) { throw "missing payout" }
if ($fin.json.vat_by_country.Count -lt 1) { throw "missing vat_by_country" }
$nl = @($fin.json.vat_by_country | Where-Object { $_.country_code -eq "NL" })
if ($nl.Count -lt 1) { throw "expected NL vat row" }

Write-Host "PASS e2e-s3-08-05-finance-ui order=$orderId net=$($fin.json.summary.net_revenue)"
