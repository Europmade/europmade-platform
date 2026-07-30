# S3-03-04 E2E — run with: pwsh -File scripts/e2e-s3-03-04.ps1
$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
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

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

$retailerEmail = "retailer-s304-$ts@example.com"
$producerEmail = "producer-s304-$ts@example.com"
$retailer2Email = "retailer2-s304-$ts@example.com"
$rToken = New-Customer $retailerEmail "Retailer"
$pToken = New-Customer $producerEmail "Producer"
$r2Token = New-Customer $retailer2Email "Retailer2"
$rSeller = Onboard-Partner $rToken $true $false "Retailer Co $ts"
$pSeller = Onboard-Partner $pToken $false $true "Producer Co $ts"
$r2Seller = Onboard-Partner $r2Token $true $false "Retailer2 Co $ts"
Write-Host "Onboarded $($rSeller.id) $($pSeller.id) $($r2Seller.id)"

foreach ($sid in @($rSeller.id, $pSeller.id, $r2Seller.id)) {
  $ap = Invoke-Json "$backend/admin/partners/$sid/approve" "POST" $adminH "{}"
  if ($ap.status -notin 200,201) { throw "approve $sid $($ap.raw)" }
}
Write-Host "Approved"

$rH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $rToken"; "x-publishable-api-key"=$pubKey }
$pH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $pToken"; "x-publishable-api-key"=$pubKey }
$r2H = @{ "Content-Type"="application/json"; "Authorization"="Bearer $r2Token"; "x-publishable-api-key"=$pubKey }
$ean = "{0:D13}" -f (Get-Random -Minimum 1000000000000 -Maximum 8999999999999)

Write-Host "=== Create product ean=$ean ==="
$createJson = @{
  brand_id="brand_e2e"; manufacturer_id="mfr_e2e"; title="E2E Product $ts"; description="Beschrijving $ts"
  category_name="E2E Cat"; identifier_type="GTIN"; identifier_value="$ean"; create_as_retailer=$true
  media=@(@{ media_type="Hoofdafbeelding"; storage_reference="file://e2e-main.jpg" })
} | ConvertTo-Json -Depth 5 -Compress
$create = Invoke-Json "$backend/store/product-cloud/products" "POST" $rH $createJson
Write-Host "create $($create.status) $($create.raw)"
if ($create.status -ne 201) { throw "create failed" }
$productId = $create.json.product_id
$versionId = $create.json.version_id
if ($create.json.lifecycle_status -ne "Retailer Created") { throw "lifecycle $($create.json.lifecycle_status)" }

$dup = Invoke-Json "$backend/store/product-cloud/products" "POST" $r2H (@{ brand_id="brand_e2e"; manufacturer_id="mfr_e2e"; title="Dup"; description="Dup"; identifier_value="$ean"; create_as_retailer=$true } | ConvertTo-Json -Compress)
if ($dup.status -ne 200 -or -not $dup.json.exact_match_existing) { throw "dup $($dup.raw)" }
Write-Host "Duplicate blocked OK"

$sub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $rH "{}"
if ($sub.status -ne 200) { throw "submit $($sub.raw)" }
$detail = Invoke-Json "$backend/store/product-cloud/products/$productId" "GET" $rH $null
if ($detail.json.product.lifecycle_status -ne "Concept gecontroleerd") { throw "after submit $($detail.json.product.lifecycle_status)" }

$pub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $rH "{}"
if ($pub.status -ne 200 -or $pub.json.lifecycle_status -ne "Actief") { throw "publish $($pub.raw)" }
Write-Host "Publish Actief OK"

$claim = Invoke-Json "$backend/store/product-cloud/claims" "POST" $pH (@{ product_id=$productId } | ConvertTo-Json -Compress)
if ($claim.status -ne 201) { throw "claim $($claim.raw)" }
$decide = Invoke-Json "$backend/admin/product-cloud/claims/$($claim.json.claim.id)/decide" "POST" $adminH (@{ decision="approve" } | ConvertTo-Json -Compress)
if ($decide.status -ne 200) { throw "decide $($decide.raw)" }
$adminDetail = Invoke-Json "$backend/admin/product-cloud/products/$productId" "GET" $adminH $null
if ($adminDetail.json.product.current_owner_seller_id -ne $pSeller.id) { throw "owner $($adminDetail.json.product.current_owner_seller_id)" }
Write-Host "Claim OK"

$prop = Invoke-Json "$backend/store/product-cloud/change-proposals" "POST" $r2H (@{ product_id=$productId; proposed_title="Nieuwe titel $ts"; proposed_description="Desc $ts"; toelichting="Correctie" } | ConvertTo-Json -Compress)
if ($prop.status -ne 201) { throw "prop $($prop.raw)" }
$accept = Invoke-Json "$backend/store/product-cloud/change-proposals/$($prop.json.change_proposal.id)/decide" "POST" $pH (@{ decision="accept" } | ConvertTo-Json -Compress)
if ($accept.status -ne 200 -or -not $accept.json.version) { throw "accept $($accept.raw)" }

$prop2 = Invoke-Json "$backend/store/product-cloud/change-proposals" "POST" $r2H (@{ product_id=$productId; proposed_title="Bad"; toelichting="x" } | ConvertTo-Json -Compress)
$reject = Invoke-Json "$backend/store/product-cloud/change-proposals/$($prop2.json.change_proposal.id)/decide" "POST" $pH (@{ decision="reject"; decision_reason="Niet accuraat" } | ConvertTo-Json -Compress)
if ($reject.json.proposal.status -ne "Afgewezen") { throw "reject $($reject.raw)" }

$prop3 = Invoke-Json "$backend/store/product-cloud/change-proposals" "POST" $r2H (@{ product_id=$productId; proposed_title="Merged title $ts"; toelichting="Merge" } | ConvertTo-Json -Compress)
$accept2 = Invoke-Json "$backend/store/product-cloud/change-proposals/$($prop3.json.change_proposal.id)/decide" "POST" $pH (@{ decision="accept" } | ConvertTo-Json -Compress)
if ($accept2.json.version.id -ne $accept.json.version.id) { throw "B-PM3 id" }
if ($accept2.json.version.title -ne "Merged title $ts") { throw "B-PM3 title $($accept2.json.version.title)" }
Write-Host "Change proposals + B-PM3 OK"

$life1 = Invoke-Json "$backend/store/product-cloud/products/$productId/lifecycle" "POST" $pH (@{ target_status="Uitlopend" } | ConvertTo-Json -Compress)
if ($life1.status -ne 200) { throw "uitlopend $($life1.raw)" }
$life2 = Invoke-Json "$backend/store/product-cloud/products/$productId/lifecycle" "POST" $pH (@{ target_status="Niet meer leverbaar" } | ConvertTo-Json -Compress)
if ($life2.status -ne 200) { throw "nml $($life2.raw)" }
$arch = Invoke-Json "$backend/admin/product-cloud/products/$productId/lifecycle" "POST" $adminH (@{ target_status="Gearchiveerd" } | ConvertTo-Json -Compress)
if ($arch.json.product.lifecycle_status -ne "Gearchiveerd") { throw "arch $($arch.raw)" }
Write-Host "Lifecycle OK"

$loginReg = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$retailerEmail; password=$pass } | ConvertTo-Json -Compress)
$ob = Invoke-Json "$backend/store/partner-onboarding" "GET" @{ "Authorization"="Bearer $($loginReg.json.token)"; "x-publishable-api-key"=$pubKey } $null
if ($ob.json.onboarding.onboarding_status -ne "Goedgekeurd") { throw "regression" }
Write-Host ""
Write-Host "=== S3-03-04 E2E ALL PASSED ==="
