# S3-06-01/02/03 Reviews — run: powershell -File scripts/e2e-s3-06-reviews.ps1
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

foreach ($p in @("/account/reviews","/account/reviews/new")) {
  $c = curl.exe -s -o NUL -w "%{http_code}" "$web$p"
  if ($c -ne "200") { throw "UI $p -> $c" }
  Write-Host "OK UI $p"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-rev-$ts@example.com"
$bEmail = "buyer-rev-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner + product + offer + order ==="
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Rev Co $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="Rev $ts"; description="Rev $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://rev-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
$productId = $create.json.product_id
$versionId = $create.json.version_id
$identifierId = $create.json.identifier_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=5; base_price=40; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)

$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference="pay-rev-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=1 })
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }
$lineId = $place.json.orders[0].line_ids[0]
$sellerId = $place.json.orders[0].seller_id

Write-Host "=== Eligible ==="
$elig = Invoke-Json "$backend/store/reviews/eligible" "GET" $bH $null
if ($elig.status -ne 200) { throw "eligible $($elig.raw)" }
$hit = @($elig.json.eligible) | Where-Object { $_.order_line_id -eq $lineId } | Select-Object -First 1
if (-not $hit) { throw "line not eligible $($elig.raw)" }
if (-not $hit.can_product_review -or -not $hit.can_seller_review) { throw "expected both review types open" }
Write-Host "OK eligible"

Write-Host "=== Submit product + seller review ==="
$pr = Invoke-Json "$backend/store/reviews" "POST" $bH (@{
  order_line_id=$lineId; review_type="Productreview"; score=5; text="Uitstekend product"
} | ConvertTo-Json -Compress)
if ($pr.status -ne 201) { throw "product review $($pr.raw)" }
$sr = Invoke-Json "$backend/store/reviews" "POST" $bH (@{
  order_line_id=$lineId; review_type="Verkopersreview"; score=4; text="Goede service"
} | ConvertTo-Json -Compress)
if ($sr.status -ne 201) { throw "seller review $($sr.raw)" }

$dup = Invoke-Json "$backend/store/reviews" "POST" $bH (@{
  order_line_id=$lineId; review_type="Productreview"; score=3
} | ConvertTo-Json -Compress)
if ($dup.status -notin 400,409) { throw "expected duplicate reject $($dup.status) $($dup.raw)" }
Write-Host "OK duplicate blocked"

Write-Host "=== Public product + lists ==="
$pub = Invoke-Json "$backend/store/catalog/products/$productId" "GET" @{ "x-publishable-api-key"=$pubKey } $null
if ($pub.status -ne 200) { throw "catalog $($pub.raw)" }
if (@($pub.json.reviews).Count -lt 1) { throw "public product reviews missing" }
$uiProd = curl.exe -s -o NUL -w "%{http_code}" "$web/products/$productId"
if ($uiProd -ne "200") { throw "UI product $uiProd" }
Write-Host "OK public product UI"

$plist = Invoke-Json ($backend + '/store/reviews?product_id=' + $productId) "GET" @{ "x-publishable-api-key"=$pubKey } $null
if (@($plist.json.reviews).Count -lt 1) { throw "product list empty" }
$slist = Invoke-Json ($backend + '/store/reviews?seller_id=' + $sellerId) "GET" @{ "x-publishable-api-key"=$pubKey } $null
if ($slist.json.aggregate.count -lt 1) { throw "seller aggregate missing" }
if ([math]::Abs([double]$slist.json.aggregate.average_score - 4.0) -gt 0.01) { throw "expected avg 4 got $($slist.json.aggregate.average_score)" }
Write-Host "OK aggregates"

Write-Host "=== Audit + DB ==="
$auditUrl = $backend + '/admin/audit-log?entity_type=review&action_type=ReviewSubmitted'
$audit = Invoke-Json $auditUrl "GET" $adminH $null
if (@($audit.json.audit_log).Count -lt 1) { throw "audit ReviewSubmitted missing" }
$db = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from review where order_line_id='$lineId';"
if ([int]$db -lt 2) { throw "db review count=$db" }
Write-Host "OK db=$db"

Write-Host "=== Login regression ==="
$loginAgain = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$bEmail; password=$pass } | ConvertTo-Json -Compress)
if ($loginAgain.status -ne 200) { throw "relogin $($loginAgain.raw)" }

Write-Host ""
Write-Host "ALL GREEN - S3-06-01 / S3-06-02 / S3-06-03"
