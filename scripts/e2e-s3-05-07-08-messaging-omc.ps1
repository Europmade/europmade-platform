# S3-05-07 messaging + S3-05-08 OMC — run: powershell -File scripts/e2e-s3-05-07-08-messaging-omc.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$web = "http://localhost:3000"
$adminUi = "http://localhost:3001"
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

Write-Host "=== UI pages ==="
foreach ($p in @("/account/messages","/seller/messages")) {
  $c = curl.exe -s -o NUL -w "%{http_code}" "$web$p"
  if ($c -ne "200") { throw "UI $p -> $c" }
  Write-Host "OK $p"
}
$adminCode = curl.exe -s -o NUL -w "%{http_code}" "$adminUi/orders"
if ($adminCode -notin @("200","307","308","302","401")) {
  Write-Host "WARN admin UI $adminCode (start apps/admin on :3001 if needed)"
} else {
  Write-Host "OK admin /orders -> $adminCode"
}

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-msg-$ts@example.com"
$bEmail = "buyer-msg-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

$start = Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress)
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Msg Co $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="Msg $ts"; description="Msg $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://msg-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
$productId = $create.json.product_id
$versionId = $create.json.version_id
$identifierId = $create.json.identifier_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=5; base_price=30; shipping_cost=4; vat_rate=0.21
} | ConvertTo-Json -Compress)

$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference="pay-msg-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=1 })
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }
$orderId = $place.json.orders[0].order_id
$lineId = $place.json.orders[0].line_ids[0]

Write-Host "=== Messaging ==="
$m1 = Invoke-Json "$backend/store/order-service/orders/$orderId/messages" "POST" $bH (@{ body="Hallo, wanneer verzenden jullie?" } | ConvertTo-Json -Compress)
if ($m1.status -ne 201) { throw "buyer msg $($m1.raw)" }
$m2 = Invoke-Json "$backend/store/order-service/orders/$orderId/messages" "POST" $rH (@{ body="Morgen gaat het pakket de deur uit." } | ConvertTo-Json -Compress)
if ($m2.status -ne 201) { throw "seller msg $($m2.raw)" }

$thread = Invoke-Json "$backend/store/order-service/orders/$orderId/messages" "GET" $bH $null
if ($thread.status -ne 200 -or $thread.json.messages.Count -lt 2) { throw "thread $($thread.raw)" }
if (-not $thread.json.viewer_customer_id) { throw "missing viewer_customer_id" }

$inboxB = Invoke-Json "$backend/store/order-service/messages" "GET" $bH $null
$inboxS = Invoke-Json "$backend/store/order-service/seller/messages" "GET" $rH $null
if ($inboxB.status -ne 200 -or $inboxS.status -ne 200) { throw "inbox failed" }

Write-Host "=== Admin cannot read messages before escalate ==="
$adminMsgBlocked = Invoke-Json "$backend/admin/order-service/orders/$orderId/messages" "GET" $adminH $null
if ($adminMsgBlocked.status -lt 400) { throw "admin should be blocked before escalate" }

$ret = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{ order_line_id=$lineId; reason="Te laat" } | ConvertTo-Json -Compress)
Invoke-Json "$backend/store/order-service/seller/returns/$($ret.json.return.id)/reject" "POST" $rH (@{ decision_reason="Buiten termijn / gebruik" } | ConvertTo-Json -Compress) | Out-Null
Invoke-Json "$backend/store/order-service/returns/$($ret.json.return.id)/escalate" "POST" $bH "{}" | Out-Null

$adminMsg = Invoke-Json "$backend/admin/order-service/orders/$orderId/messages" "GET" $adminH $null
if ($adminMsg.status -ne 200 -or $adminMsg.json.messages.Count -lt 2) { throw "admin meelezen $($adminMsg.raw)" }

Write-Host "=== OMC list/detail ==="
$omc = Invoke-Json "$backend/admin/order-service/orders" "GET" $adminH $null
if ($omc.status -ne 200 -or $omc.json.count -lt 1) { throw "omc list $($omc.raw)" }
$omcDetail = Invoke-Json "$backend/admin/order-service/orders/$orderId" "GET" $adminH $null
if ($omcDetail.status -ne 200) { throw "omc detail $($omcDetail.raw)" }

Write-Host "=== Login regression ==="
$login2 = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$bEmail; password=$pass } | ConvertTo-Json -Compress)
if ($login2.status -ne 200) { throw "re-login" }

Write-Host ""
Write-Host "=== S3-05-07/08 messaging + OMC E2E ALL PASSED ==="
