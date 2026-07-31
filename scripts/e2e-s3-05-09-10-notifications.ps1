# S3-10-01 + S3-10-02 + S3-05-09 — run: powershell -File scripts/e2e-s3-05-09-10-notifications.ps1
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

function Wait-ForNotif($headers, $type, $seconds = 20) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    $n = Invoke-Json "$backend/store/notifications" "GET" $headers $null
    if ($n.status -ne 200) { throw "notifications $($n.raw)" }
    $hit = @($n.json.notifications) | Where-Object { $_.notification_type -eq $type } | Select-Object -First 1
    if ($hit) { return $n }
    Start-Sleep -Milliseconds 500
  }
  $final = Invoke-Json "$backend/store/notifications" "GET" $headers $null
  throw "timeout waiting for $type - got $($final.raw)"
}

Write-Host "=== Health ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }

# Login existing + register new (regressie)
$loginExisting = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
# admin is user auth; just ensure register/login customer path works below

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$rEmail = "retailer-notif-$ts@example.com"
$bEmail = "buyer-notif-$ts@example.com"
$rToken = New-Customer $rEmail "Retailer"
$bToken = New-Customer $bEmail "Buyer"
$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$bH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $bToken"; "x-publishable-api-key"=$pubKey }

Write-Host "=== Partner + product + offer ==="
$start = Invoke-Json "$backend/store/partner-onboarding" "POST" $rH (@{ is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false } | ConvertTo-Json -Compress)
$kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
Invoke-Json "$backend/store/partner-onboarding" "PATCH" $rH (@{
  is_retailer=$true; is_producer_or_brand_owner=$false; is_distributor=$false
  company=@{ legal_name="Notif Co $ts"; chamber_of_commerce_number=$kvk; vat_number="NL123456789B01"; country_code="NL"; iban="NL91ABNA0417164300" }
} | ConvertTo-Json -Depth 5 -Compress) | Out-Null
Upload-Doc $rToken "identity_document"
Upload-Doc $rToken "chamber_of_commerce_extract"
Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $rH (@{ accepted_terms=$true } | ConvertTo-Json -Compress) | Out-Null
$me = Invoke-Json "$backend/store/partner-onboarding" "GET" $rH $null
Invoke-Json "$backend/admin/partners/$($me.json.onboarding.id)/approve" "POST" $adminH "{}" | Out-Null

$ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH (@{
  brand_id="B"; manufacturer_id="B"; title="Notif $ts"; description="Notif $ts"
  category_name="Elektronica"; identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://notif-$ts.jpg" })
} | ConvertTo-Json -Depth 5 -Compress)
$productId = $create.json.product_id
$versionId = $create.json.version_id
$identifierId = $create.json.identifier_id
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}" | Out-Null
$offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $rH (@{
  identifier_id=$identifierId; region_code="NL"; quantity_available=5; base_price=30; shipping_cost=4; vat_rate=0.21
} | ConvertTo-Json -Compress)

Write-Host "=== Place order (OrderPlaced + OrderSplit) ==="
$place = Invoke-Json "$backend/store/order-service/checkout/place" "POST" $bH (@{
  payment_reference="pay-notif-$ts"; payment_mode="simulated"
  shipping_address="A 1"; billing_address="A 1"
  lines=@(@{ offer_id=$offer.json.offer_id; quantity=1 })
} | ConvertTo-Json -Depth 5 -Compress)
if ($place.status -ne 201) { throw "place $($place.raw)" }
$orderId = $place.json.orders[0].order_id
$orderSetId = $place.json.order_set_id
$lineId = $place.json.orders[0].line_ids[0]

Start-Sleep -Seconds 1
$buyerNotif = Wait-ForNotif $bH "OrderPlaced"
Write-Host "OK buyer OrderPlaced feed=$($buyerNotif.json.notifications.Count)"
$sellerNotif = Wait-ForNotif $rH "OrderSplit"
Write-Host "OK seller OrderSplit"

Write-Host "=== Audit log ==="
$auditUrl = $backend + '/admin/audit-log?entity_type=order_set&entity_id=' + $orderSetId + '&action_type=OrderPlaced'
$audit = Invoke-Json $auditUrl "GET" $adminH $null
if ($audit.status -ne 200) { throw "audit $($audit.raw)" }
if (@($audit.json.audit_log).Count -lt 1) { throw "expected OrderPlaced audit row: $($audit.raw)" }
Write-Host "OK audit OrderPlaced id=$($audit.json.audit_log[0].id)"

$auditSplitUrl = $backend + '/admin/audit-log?entity_type=em_order&entity_id=' + $orderId + '&action_type=OrderSplit'
$auditSplit = Invoke-Json $auditSplitUrl "GET" $adminH $null
if (@($auditSplit.json.audit_log).Count -lt 1) { throw "expected OrderSplit audit" }
Write-Host "OK audit OrderSplit"

Write-Host "=== MessageSent notification ==="
$m1 = Invoke-Json "$backend/store/order-service/orders/$orderId/messages" "POST" $bH (@{ body="Vraag over levering" } | ConvertTo-Json -Compress)
if ($m1.status -ne 201) { throw "msg $($m1.raw)" }
$sellerMsg = Wait-ForNotif $rH "MessageSent"
Write-Host "OK seller MessageSent"

Write-Host "=== Return + status + refund ==="
$ret = Invoke-Json "$backend/store/order-service/returns" "POST" $bH (@{
  order_line_id=$lineId; reason="Te groot"
} | ConvertTo-Json -Compress)
if ($ret.status -ne 201) { throw "return $($ret.raw)" }
$returnId = $ret.json.return.id
$sellerRet = Wait-ForNotif $rH "ReturnRequested"
Write-Host "OK seller ReturnRequested"

Invoke-Json "$backend/store/order-service/seller/returns/$returnId/confirm" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/order-service/seller/returns/$returnId/receive" "POST" $rH "{}" | Out-Null
Invoke-Json "$backend/store/order-service/seller/returns/$returnId/approve" "POST" $rH "{}" | Out-Null

$buyerRet = Wait-ForNotif $bH "ReturnStatusChanged"
Write-Host "OK buyer ReturnStatusChanged"
$buyerRefund = Wait-ForNotif $bH "RefundExecuted"
Write-Host "OK buyer RefundExecuted"

$auditRetUrl = $backend + '/admin/audit-log?entity_type=em_return&entity_id=' + $returnId
$auditRet = Invoke-Json $auditRetUrl "GET" $adminH $null
$actions = @($auditRet.json.audit_log | ForEach-Object { $_.action_type })
foreach ($need in @("ReturnRequested","ReturnStatusChanged","RefundExecuted")) {
  if ($actions -notcontains $need) { throw "audit missing $need - $($actions -join ',')" }
}
Write-Host "OK audit return lifecycle"

Write-Host "=== Mark read ==="
$nid = $buyerNotif.json.notifications[0].id
$read = Invoke-Json "$backend/store/notifications/$nid/read" "POST" $bH "{}"
if ($read.status -ne 200) { throw "read $($read.raw)" }
if (-not $read.json.notification.read_at) { throw "read_at missing" }
Write-Host "OK mark read"

Write-Host "=== DB steekproef ==="
$dbAudit = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from audit_log where action_type='OrderPlaced' and entity_id='$orderSetId';"
$dbFeed = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select count(*) from in_app_notification where notification_type='OrderPlaced' and source_entity_id='$orderSetId';"
if ([int]$dbAudit -lt 1) { throw "db audit count=$dbAudit" }
if ([int]$dbFeed -lt 1) { throw "db feed count=$dbFeed" }
Write-Host "OK db audit=$dbAudit feed=$dbFeed"

Write-Host ""
Write-Host "ALL GREEN - S3-10-01 / S3-10-02 / S3-05-09"
