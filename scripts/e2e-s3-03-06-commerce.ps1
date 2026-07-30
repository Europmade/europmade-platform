# S3-03-06 + S3-04-01 Offer/Commerce E2E — run: powershell -File scripts/e2e-s3-03-06-commerce.ps1
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
  Write-Host "=== Register $roleLabel ==="
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

Write-Host "=== Seller UI routes ==="
foreach ($path in @("/seller/products","/seller/products/add","/seller/products/new","/seller/products/offer")) {
  $code = curl.exe -s -o NUL -w "%{http_code}" "$web$path"
  if ($code -notin @("200","307","308")) { throw "UI $path status $code" }
  Write-Host "OK $path -> $code"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$retailerEmail = "retailer-s306-$ts@example.com"
$producerEmail = "producer-s306-$ts@example.com"
$rToken = New-Customer $retailerEmail "Retailer"
$pToken = New-Customer $producerEmail "Producer"
$rSeller = Onboard-Partner $rToken $true $false "Retailer Co $ts"
$pSeller = Onboard-Partner $pToken $false $true "Producer Co $ts"

$approveR = Invoke-Json "$backend/admin/partners/$($rSeller.id)/approve" "POST" $adminH "{}"
$approveP = Invoke-Json "$backend/admin/partners/$($pSeller.id)/approve" "POST" $adminH "{}"
if ($approveR.status -ne 200 -or $approveP.status -ne 200) { throw "approve failed" }
Write-Host "Approved sellers"

$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$pH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $pToken"; "x-publishable-api-key"=$pubKey }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
Write-Host "=== Create Retailer Created product ==="
$createJson = @{
  brand_id="Brand $ts"; manufacturer_id="Brand $ts"; title="S306 Headset $ts"; description="S306 Headset $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://s306-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH $createJson
if ($create.status -ne 201) { throw "create $($create.raw)" }
if (-not $create.json.identifier_id) { throw "missing identifier_id $($create.raw)" }
$identifierId = $create.json.identifier_id
$productId = $create.json.product_id
$versionId = $create.json.version_id
Write-Host "product=$productId identifier=$identifierId"

Write-Host "=== Upsert Offer (create) ==="
$offerBody = @{
  identifier_id=$identifierId; region_code="NL"
  quantity_available=42; base_price=79.0; shipping_cost=4.95; vat_rate=0.21
} | ConvertTo-Json -Compress
$offerCreate = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH $offerBody
if ($offerCreate.status -ne 201) { throw "offer create $($offerCreate.raw)" }
if (-not $offerCreate.json.created) { throw "expected created=true $($offerCreate.raw)" }
$offerId = $offerCreate.json.offer_id
Write-Host "offer=$offerId"

Write-Host "=== Upsert Offer (update) ==="
$offerBody2 = @{
  identifier_id=$identifierId; region_code="NL"
  quantity_available=40; base_price=75.5; shipping_cost=4.95; vat_rate=0.21
} | ConvertTo-Json -Compress
$offerUpdate = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH $offerBody2
if ($offerUpdate.status -ne 200) { throw "offer update $($offerUpdate.raw)" }
if ($offerUpdate.json.created) { throw "expected created=false $($offerUpdate.raw)" }
if ($offerUpdate.json.offer_id -ne $offerId) { throw "offer id changed" }

Write-Host "=== List offers + preview ==="
$list = Invoke-Json "$backend/store/commerce-cloud/offers?identifier_id=$identifierId&region_code=NL" "GET" $rH $null
if ($list.status -ne 200) { throw "list $($list.raw)" }
if ($list.json.count -lt 1) { throw "no offers $($list.raw)" }
$total = [double]$list.json.offers[0].total_price
if ([math]::Abs($total - 80.45) -gt 0.001) { throw "total_price $total expected 80.45" }
if (-not $list.json.product_preview) { throw "missing product_preview" }
if ($list.json.product_preview.title -ne "S306 Headset $ts") { throw "preview title" }

Write-Host "=== Get offer detail ==="
$detail = Invoke-Json "$backend/store/commerce-cloud/offers/$offerId" "GET" $rH $null
if ($detail.status -ne 200) { throw "detail $($detail.raw)" }
if ($detail.json.buy_box.status -ne "computed") { throw "buy_box $($detail.raw)" }
if (-not $detail.json.buy_box.winning_offer_id) { throw "missing winning_offer_id $($detail.raw)" }
if ([double]$detail.json.inventory.quantity_available -ne 40) { throw "qty" }

Write-Host "=== Producer exact match → own offer ==="
$sub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}"
if ($sub.status -ne 200) { throw "submit $($sub.raw)" }
$pub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}"
if ($pub.status -ne 200) { throw "publish $($pub.raw)" }

$ex = Invoke-Json "$backend/store/product-cloud/ean-match" "POST" $pH (@{ identifier_value=$ean; identifier_type="GTIN" } | ConvertTo-Json -Compress)
if ($ex.status -ne 200 -or $ex.json.outcome -ne "exact_match") { throw "exact $($ex.raw)" }
if (-not $ex.json.identifier_id) { throw "match missing identifier_id" }
if (-not $ex.json.product_preview.identifier_id) { throw "preview missing identifier_id" }

$pOffer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $pH (@{
  identifier_id=$ex.json.identifier_id; region_code="NL"
  quantity_available=10; base_price=70; shipping_cost=3; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($pOffer.status -ne 201) { throw "producer offer $($pOffer.raw)" }

Write-Host "=== Producer cannot read retailer offer ==="
$deny = Invoke-Json "$backend/store/commerce-cloud/offers/$offerId" "GET" $pH $null
if ($deny.status -notin 400,403) { throw "expected deny got $($deny.status) $($deny.raw)" }

Write-Host "=== Login regression ==="
$login2 = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$retailerEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login2.status -ne 200) { throw "re-login $($login2.raw)" }

Write-Host ""
Write-Host "=== S3-03-06 / Commerce Offer E2E ALL PASSED ==="
