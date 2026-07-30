# S3-04-02 Buy Box engine E2E — run: powershell -File scripts/e2e-s3-04-02-buy-box.ps1
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

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-bb-$ts@example.com"
$pEmail = "producer-bb-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$pToken = New-Customer $pEmail "Producer"
$rSeller = Onboard-Partner $rToken $true $false "Retailer BB $ts"
$pSeller = Onboard-Partner $pToken $false $true "Producer BB $ts"
$approveR = Invoke-Json "$backend/admin/partners/$($rSeller.id)/approve" "POST" $adminH "{}"
$approveP = Invoke-Json "$backend/admin/partners/$($pSeller.id)/approve" "POST" $adminH "{}"
if ($approveR.status -ne 200 -or $approveP.status -ne 200) { throw "approve failed" }

$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$pH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $pToken"; "x-publishable-api-key"=$pubKey }

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="Brand BB"; manufacturer_id="Brand BB"; title="BB Product $ts"; description="BB Product $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://bb-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
if ($create.status -ne 201) { throw "create $($create.raw)" }
$identifierId = $create.json.identifier_id
$productId = $create.json.product_id
$versionId = $create.json.version_id

$sub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}"
if ($sub.status -ne 200) { throw "submit $($sub.raw)" }
$pub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}"
if ($pub.status -ne 200) { throw "publish $($pub.raw)" }

Write-Host "=== Retailer expensive offer ==="
$o1 = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=5
  base_price=100; shipping_cost=10; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($o1.status -ne 201) { throw "offer1 $($o1.raw)" }
if (-not $o1.json.buy_box) { throw "missing buy_box on create $($o1.raw)" }
if ($o1.json.buy_box.winning_offer_id -ne $o1.json.offer_id) { throw "retailer should win alone $($o1.raw)" }

Write-Host "=== Producer cheaper offer wins ==="
$o2 = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $pH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=3
  base_price=80; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($o2.status -ne 201) { throw "offer2 $($o2.raw)" }
if ($o2.json.buy_box.winning_offer_id -ne $o2.json.offer_id) { throw "cheaper should win $($o2.raw)" }
if ($o2.json.buy_box.ranked.Count -lt 2) { throw "expected 2 ranked $($o2.raw)" }

Write-Host "=== GET buy-box ==="
$bb = Invoke-Json "$backend/store/commerce-cloud/buy-box?identifier_id=$identifierId&region_code=NL" "GET" $pH $null
if ($bb.status -ne 200) { throw "buy-box get $($bb.raw)" }
if ($bb.json.buy_box.winning_offer_id -ne $o2.json.offer_id) { throw "get winner mismatch $($bb.raw)" }

Write-Host "=== Zero stock excluded ==="
$o2u = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $pH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=0
  base_price=80; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)
if ($o2u.status -ne 200) { throw "offer2 update $($o2u.raw)" }
if ($o2u.json.buy_box.winning_offer_id -ne $o1.json.offer_id) { throw "retailer should win after OOS $($o2u.raw)" }

Write-Host "=== Detail shows computed buy_box ==="
$detail = Invoke-Json "$backend/store/commerce-cloud/offers/$($o1.json.offer_id)" "GET" $rH $null
if ($detail.status -ne 200) { throw "detail $($detail.raw)" }
if ($detail.json.buy_box.status -ne "computed") { throw "detail status $($detail.raw)" }
if (-not $detail.json.buy_box.is_winner) { throw "retailer should be winner in detail $($detail.raw)" }

Write-Host "=== Login regression ==="
$login2 = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$rEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login2.status -ne 200) { throw "re-login $($login2.raw)" }

Write-Host ""
Write-Host "=== S3-04-02 Buy Box E2E ALL PASSED ==="
