# S3-03-07 + S3-07-06 + S3-11-03 — run: powershell -File scripts/e2e-s3-07-06-moderation-fraud.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$web = "http://localhost:3000"
$admin = "http://localhost:3001"
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

Write-Host "=== Health ==="
foreach ($u in @("$backend/health", $web, "$admin/moderation")) {
  $c = curl.exe -s -o NUL -w "%{http_code}" $u
  if ($c -ne "200") { throw "health $u -> $c" }
  Write-Host "OK $u"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

$aToken = New-Customer "aff-fraud-$ts@example.com" "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Affiliate approve + link ==="
$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/fraud-$ts"; legal_name="Fraud Aff $ts"
  iban="NL91ABNA0417164300"; country_code="NL"
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "reg $($regAff.raw)" }
$affiliateId = $regAff.json.affiliate.id
Invoke-Json "$backend/admin/affiliates/$affiliateId/approve" "POST" $adminH "{}" | Out-Null
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/p/fraud-$ts" } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }
$tracking = $link.json.link.tracking_param

Write-Host "=== Click velocity fraud (ADR-0032) ==="
$visitor = "fraud-vis-$ts-abcdefgh"
Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitor; consent_given=$true } | ConvertTo-Json -Compress) | Out-Null
for ($i = 0; $i -lt 20; $i++) {
  $r = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitor } | ConvertTo-Json -Compress)
  if ($r.status -ne 201) { throw "click $i failed $($r.status) $($r.raw)" }
}
$blocked = Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key=$visitor } | ConvertTo-Json -Compress)
if ($blocked.status -lt 400) { throw "21st click must be blocked" }

$queues = Invoke-Json "$backend/admin/moderation/queues" "GET" $adminH $null
if ($queues.status -ne 200) { throw "queues $($queues.raw)" }
$fraudeCount = (@($queues.json.queues) | Where-Object { $_.key -eq "fraude" } | Select-Object -First 1).count
if ([int]$fraudeCount -lt 1) { throw "expected fraude queue item" }

$fraudeList = Invoke-Json "$backend/admin/moderation/queues/fraude" "GET" $adminH $null
if ($fraudeList.status -ne 200) { throw "fraude list $($fraudeList.raw)" }
$case = @($fraudeList.json.items) | Where-Object { $_.signal_code -eq "click_velocity_link" } | Select-Object -First 1
if (-not $case) { throw "missing click_velocity_link case" }

Write-Host "=== Decide Geen actie (F6 logged) ==="
$decide = Invoke-Json "$backend/admin/moderation/cases/$($case.id)/decide" "POST" $adminH (@{ decision="geen_actie"; reason="False positive test" } | ConvertTo-Json -Compress)
if ($decide.status -ne 200) { throw "decide $($decide.raw)" }
if ($decide.json.case.status -ne "Geen actie") { throw "expected Geen actie" }

$db = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select status, decision_reason from moderation_case where id='$($case.id)';"
if ($db -notmatch "Geen actie") { throw "db status $db" }

Write-Host "=== Self-attribution signal ==="
$selfVisitor = "self-$ts-abcdefgh"
Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$selfVisitor; consent_given=$true } | ConvertTo-Json -Compress) | Out-Null
# need product/offer for place - reuse affiliate e2e pattern lightly via coupon self
$cpn = Invoke-Json "$backend/store/affiliate/coupons" "POST" $aH (@{ code="FRF$ts" } | ConvertTo-Json -Compress)
if ($cpn.status -ne 201) { throw "coupon $($cpn.raw)" }

# Setup retailer + offer for order
function Upload-Doc($token, $docType) {
  $tmp = Join-Path $env:TEMP "e2e-$docType-$ts-$([guid]::NewGuid().ToString('N').Substring(0,6)).pdf"
  [System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
  $out = curl.exe -s -w "`n%{http_code}" -X POST "$backend/store/partner-onboarding/documents" -H "Authorization: Bearer $token" -H "x-publishable-api-key: $pubKey" -F "file=@$tmp;type=application/pdf;filename=$docType.pdf" -F "document_type=$docType"
  $code = (($out -split "`n") | Where-Object { $_ -ne "" })[-1]
  if ($code -notin @("200","201")) { throw "upload $docType failed $out" }
}
$rToken = New-Customer "ret-fraud-$ts@example.com" "Retailer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress) | Out-Null
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Fraud Ret $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null
$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="FraudProd $ts"; description="x"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://f-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
Invoke-Json "$backend/store/product-cloud/products/$($create.json.product_id)/versions/$($create.json.version_id)/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$($create.json.product_id)/versions/$($create.json.version_id)/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$create.json.identifier_id; region_code="NL"; quantity_available=20; base_price=50; shipping_cost=5; vat_rate=0.21
} | ConvertTo-Json -Compress)

$before = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from moderation_case where signal_code='coupon_self_use';"
$placeSelf = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $aH (@{
  payment_reference="pay-self-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=1 })
  affiliate_coupon_code="FRF$ts"
} | ConvertTo-Json -Depth 5 -Compress)
if ($placeSelf.status -ne 201) { throw "place self $($placeSelf.raw)" }
Start-Sleep -Seconds 1
$after = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from moderation_case where signal_code='coupon_self_use';"
if ([int]$after -le [int]$before) { throw "expected coupon_self_use case" }
$selfConv = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from aff_conversion where order_id='$($placeSelf.json.orders[0].order_id)';"
if ([int]$selfConv -ne 0) { throw "self conversion must not exist" }

Write-Host "OK S3-03-07 / S3-07-06 / S3-11-03 moderation+fraud e2e passed affiliate=$affiliateId case=$($case.id)"
