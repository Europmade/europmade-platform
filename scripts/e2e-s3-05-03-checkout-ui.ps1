# S3-05-03 Cart/Checkout UI — run: powershell -File scripts/e2e-s3-05-03-checkout-ui.ps1
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

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend health $bh" }
if ($wh -ne "200") { throw "web health $wh" }

Write-Host "=== UI shells ==="
foreach ($path in @("/cart","/checkout","/order/confirmation")) {
  $code = curl.exe -s -o NUL -w "%{http_code}" "$web$path"
  if ($code -ne "200") { throw "ui $path -> $code" }
  Write-Host "OK $path -> 200"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-ui-$ts@example.com"
$bEmail = "buyer-ui-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rSeller = Onboard-Partner $rToken $true $false "Retailer UI $ts"
$ap = Invoke-Json "$backend/admin/partners/$($rSeller.id)/approve" "POST" $adminH "{}"
if ($ap.status -ne 200) { throw "approve $($ap.raw)" }

$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="Brand UI"; manufacturer_id="Brand UI"; title="UI Product $ts"; description="UI Product $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://ui-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
if ($create.status -ne 201) { throw "create $($create.raw)" }
$identifierId = $create.json.identifier_id
$productId = $create.json.product_id
$versionId = $create.json.version_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null

$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=12
  base_price=50; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($offer.status -ne 201) { throw "offer $($offer.raw)" }

Write-Host "=== Cart add + totals (BTW) ==="
$add = Invoke-Json "$backend/store/order-service/cart" "POST" $bH (@{ offer_id=$offer.json.offer_id; quantity=2 } | ConvertTo-Json -Compress)
if ($add.status -ne 200) { throw "cart add $($add.raw)" }
if (-not $add.json.totals) { throw "missing totals $($add.raw)" }
if ($null -eq $add.json.totals.vat_amount) { throw "missing vat $($add.raw)" }
if (-not $add.json.totals.vat_tooltip) { throw "missing vat tooltip $($add.raw)" }

Write-Host "=== Patch qty ==="
$lineId = $add.json.lines[0].line_id
$patch = Invoke-Json "$backend/store/order-service/cart/lines/$lineId" "PATCH" $bH (@{ quantity=3 } | ConvertTo-Json -Compress)
if ($patch.status -ne 200) { throw "patch $($patch.raw)" }
if ([int]$patch.json.lines[0].quantity -ne 3) { throw "qty not 3 $($patch.raw)" }

Write-Host "=== Place from cart lines ==="
$payRef = "pay-ui-$ts"
$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference=$payRef; payment_mode="simulated"
  shipping_address="Dam 1, Amsterdam"; billing_address="Dam 1, Amsterdam"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=3 })
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }

Write-Host "=== Cart cleared ==="
$cart = Invoke-Json "$backend/store/order-service/cart" "GET" $bH $null
if ($cart.status -ne 200) { throw "cart get $($cart.raw)" }
if ($cart.json.lines.Count -ne 0) { throw "cart should be empty $($cart.raw)" }

Write-Host "=== Login regression ==="
$login2 = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$bEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login2.status -ne 200) { throw "re-login $($login2.raw)" }

Write-Host ""
Write-Host "=== S3-05-03 Checkout UI E2E ALL PASSED ==="
