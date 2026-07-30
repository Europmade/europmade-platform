# S3-03-05 E2E + S3-03-04 regression — run: powershell -File scripts/e2e-s3-03-05.ps1
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

Write-Host "=== Seller UI routes (SSR shell) ==="
foreach ($path in @("/seller/products","/seller/products/add","/seller/products/new")) {
  $code = curl.exe -s -o NUL -w "%{http_code}" "$web$path"
  if ($code -notin @("200","307","308")) { throw "UI $path status $code" }
  Write-Host "OK $path -> $code"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$retailerEmail = "retailer-s305-$ts@example.com"
$producerEmail = "producer-s305-$ts@example.com"
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
Write-Host "=== EAN no_match ==="
$nm = Invoke-Json "$backend/store/product-cloud/ean-match" "POST" $rH (@{ identifier_value=$ean; identifier_type="GTIN" } | ConvertTo-Json -Compress)
if ($nm.status -ne 200 -or $nm.json.outcome -ne "no_match") { throw "no_match $($nm.raw)" }
Write-Host "no_match OK"

Write-Host "=== Create product for exact match ==="
$createJson = @{
  brand_id="brand_e2e"; manufacturer_id="mfr_e2e"; title="S305 Headset $ts"; description="Desc $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="s3://e2e/s305-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH $createJson
if ($create.status -ne 201) { throw "create $($create.raw)" }
$productId = $create.json.product_id
$versionId = $create.json.version_id

$sub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}"
if ($sub.status -ne 200) { throw "submit $($sub.raw)" }
$pub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}"
if ($pub.status -ne 200) { throw "publish $($pub.raw)" }

Write-Host "=== EAN exact_match + preview ==="
$ex = Invoke-Json "$backend/store/product-cloud/ean-match" "POST" $pH (@{ identifier_value=$ean; identifier_type="GTIN" } | ConvertTo-Json -Compress)
if ($ex.status -ne 200 -or $ex.json.outcome -ne "exact_match") { throw "exact $($ex.raw)" }
if (-not $ex.json.product_preview) { throw "missing product_preview $($ex.raw)" }
if ($ex.json.product_preview.title -ne "S305 Headset $ts") { throw "preview title $($ex.json.product_preview.title)" }
if ($ex.json.confidence_label -notmatch "100%") { throw "confidence $($ex.json.confidence_label)" }
Write-Host "exact_match preview OK (AI confidence visible, non-decisive labels present)"

Write-Host "=== Catalog list enrichment ==="
$list = Invoke-Json "$backend/store/product-cloud/products" "GET" $rH $null
if ($list.status -ne 200) { throw "list $($list.raw)" }
$hit = $list.json.products | Where-Object { $_.id -eq $productId }
if (-not $hit) { throw "product missing from list" }
if ($hit.title -ne "S305 Headset $ts") { throw "list title $($hit.title)" }
if ($hit.identifier_value -ne $ean) { throw "list ean $($hit.identifier_value)" }
Write-Host "list enrichment OK"

Write-Host "=== Login regression ==="
$login2 = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$retailerEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login2.status -ne 200) { throw "re-login $($login2.raw)" }

Write-Host ""
Write-Host "=== S3-03-05 E2E ALL PASSED ==="
Write-Host "Run also: powershell -File scripts/e2e-s3-03-04.ps1 for full prior product-cloud regression."
