# Sprint 7 demo data EXPANSION — bring catalog to >=50 EU-made S7 products.
# Reuses existing store/admin APIs. Run: powershell -File scripts/seed-sprint7-demo-expand.ps1

$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$pubKey = (Select-String -Path "$PSScriptRoot/../apps/web/.env.local" -Pattern "PUBLISHABLE_KEY=(.*)").Matches[0].Groups[1].Value.Trim()
$ts = Get-Date -Format "yyyyMMddHHmmss"
$pass = "REDACTED_E2E_PASSWORD"
$adminEmail = "admin-e2e@example.com"
$adminPass = "REDACTED_ADMIN_PASSWORD"

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
  $cust = Invoke-Json "$backend/store/customers" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey; "Authorization"="Bearer $($reg.json.token)" } (@{ email=$email; first_name=$roleLabel; last_name="S7Demo" } | ConvertTo-Json -Compress)
  if ($cust.status -notin 200,201) { throw "customer $($cust.raw)" }
  $login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($login.status -ne 200) { throw "login $($login.raw)" }
  return $login.json.token
}

function Upload-Doc($token, $docType) {
  $tmp = Join-Path $env:TEMP "s7x-$docType-$ts-$([guid]::NewGuid().ToString('N').Substring(0,6)).pdf"
  [System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
  $out = curl.exe -s -w "`n%{http_code}" -X POST "$backend/store/partner-onboarding/documents" -H "Authorization: Bearer $token" -H "x-publishable-api-key: $pubKey" -F "file=@$tmp;type=application/pdf;filename=$docType.pdf" -F "document_type=$docType"
  $code = (($out -split "`n") | Where-Object { $_ -ne "" })[-1]
  if ($code -notin @("200","201")) { throw "upload $docType failed $out" }
}

function Onboard-Partner($token, $companyName, $country) {
  $kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
  $vat = "{0}{1}B01" -f $country, (Get-Random -Minimum 100000000 -Maximum 999999999)
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $start = Invoke-Json "$backend/store/partner-onboarding" "POST" $h (@{ is_retailer=$true; is_producer_or_brand_owner=$true; is_distributor=$false } | ConvertTo-Json -Compress)
  if ($start.status -notin 200,201) { throw "start $($start.raw)" }
  $patchJson = @{
    is_retailer=$true; is_producer_or_brand_owner=$true; is_distributor=$false
    company=@{ legal_name=$companyName; chamber_of_commerce_number=$kvk; vat_number=$vat; country_code=$country; iban="NL91ABNA0417164300" }
  } | ConvertTo-Json -Depth 5 -Compress
  $patch = Invoke-Json "$backend/store/partner-onboarding" "PATCH" $h $patchJson
  if ($patch.status -ne 200) { throw "patch $($patch.raw)" }
  Upload-Doc $token "identity_document"
  Upload-Doc $token "chamber_of_commerce_extract"
  Upload-Doc $token "production_proof"
  $submit = Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $h (@{ accepted_terms=$true } | ConvertTo-Json -Compress)
  if ($submit.status -notin 200,201) { throw "submit $($submit.raw)" }
  $me = Invoke-Json "$backend/store/partner-onboarding" "GET" $h $null
  return $me.json.onboarding
}

function Ensure-Brand($token, $brandName) {
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
  $seed = Invoke-Json "$backend/store/product-cloud/products" "POST" $h (@{
    brand_id=$brandName; manufacturer_id="$brandName Works"; title="S7 Brand Seed $brandName $ts"
    description="Development seed for brand materialization only."
    category_name="Algemeen"; category_names=@("Algemeen","Ambacht")
    identifier_type="GTIN"; identifier_value=$ean; create_as_retailer=$true
    media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://s7x-seed-$ts.jpg" })
  } | ConvertTo-Json -Depth 5 -Compress)
  if ($seed.status -ne 201) { throw "brand seed $($seed.raw)" }
  $seedProductId = $seed.json.product_id
  $seedVersionId = $seed.json.version_id
  Invoke-Json "$backend/store/product-cloud/products/$seedProductId/versions/$seedVersionId/submit" "POST" $h "{}" | Out-Null
  Invoke-Json "$backend/store/product-cloud/products/$seedProductId/versions/$seedVersionId/publish" "POST" $h "{}" | Out-Null
  $encoded = [uri]::EscapeDataString($brandName)
  $patch = Invoke-Json "$backend/store/brands/$encoded" "PATCH" $h (@{
    intro="Sprint 7 development demo brand ($brandName)."
    story="Demo-only brand for EuropMade Sprint 7 validation."
  } | ConvertTo-Json -Compress)
  if ($patch.status -ne 200) { throw "brand patch $($patch.raw)" }
  $list = Invoke-Json "$backend/store/brands" "GET" $h $null
  $brand = $list.json.brands | Where-Object { $_.name -eq $brandName } | Select-Object -First 1
  if (-not $brand) { throw "brand missing $brandName" }
  docker exec europmade-postgres psql -U europmade -d europmade -c "UPDATE pc_product SET brand_id='$($brand.id)', lifecycle_status='Gearchiveerd' WHERE id='$seedProductId';" | Out-Null
  return $brand
}

function New-DemoProduct($token, $brandId, $manufacturerName, $title, $description, $categories, $price, $eanSuffix) {
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $ean = "87{0:D11}" -f ([int64]$eanSuffix)
  $primary = $categories[0]
  $body = @{
    brand_id=$brandId; manufacturer_id=$manufacturerName; title=$title; description=$description
    category_name=$primary; category_names=$categories; identifier_type="GTIN"; identifier_value=$ean
    create_as_retailer=$true
    media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://s7x-demo-$eanSuffix.jpg" })
  } | ConvertTo-Json -Depth 6 -Compress
  $create = Invoke-Json "$backend/store/product-cloud/products" "POST" $h $body
  if ($create.status -ne 201) { throw "create $title $($create.raw)" }
  $productId = $create.json.product_id
  $versionId = $create.json.version_id
  $identifierId = $create.json.identifier_id
  $sub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/submit" "POST" $h "{}"
  if ($sub.status -ne 200) { throw "submit $title $($sub.raw)" }
  $pub = Invoke-Json "$backend/store/product-cloud/products/$productId/versions/$versionId/publish" "POST" $h "{}"
  if ($pub.status -ne 200) { throw "publish $title $($pub.raw)" }
  $patchCats = Invoke-Json "$backend/store/product-cloud/products/$productId" "PATCH" $h (@{ category_names=$categories } | ConvertTo-Json -Compress)
  if ($patchCats.status -ne 200) { throw "categories $title $($patchCats.raw)" }
  $offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $h (@{
    identifier_id=$identifierId; region_code="NL"; quantity_available=20
    base_price=[math]::Round($price * 0.9, 2); shipping_cost=[math]::Round($price * 0.1, 2); vat_rate=0.21
  } | ConvertTo-Json -Compress)
  if ($offer.status -ne 201) { throw "offer $title $($offer.raw)" }
  return @{ product_id=$productId; title=$title; brand_id=$brandId; manufacturer=$manufacturerName; categories=$categories; price=$price; ean=$ean }
}

Write-Host '=== Sprint 7 demo EXPAND ==='
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
if ($bh -ne "200") { throw "backend health $bh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email=$adminEmail; password=$adminPass } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

# Archive old brand-seed products (Algemeen-only clutter) and fix single-category T-shirt.
Write-Host '=== Cleanup: archive brand seeds + fix T-shirt multi-cat ==='
docker exec europmade-postgres psql -U europmade -d europmade -c "UPDATE pc_product p SET lifecycle_status='Gearchiveerd' FROM product_version v WHERE v.product_id=p.id AND v.title LIKE 'S7 Brand Seed %';" | Out-Null
docker exec europmade-postgres psql -U europmade -d europmade -c @"
INSERT INTO pc_category (id, name, slug, created_at, updated_at)
SELECT 'pcgy_s7_mode', 'Mode', 'mode', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM pc_category WHERE name='Mode');
INSERT INTO pc_product_category (id, product_id, category_id, created_at, updated_at)
SELECT 'pcpc_s7_tshirt_mode', p.id, c.id, NOW(), NOW()
FROM pc_product p
JOIN product_version v ON v.product_id=p.id
JOIN pc_category c ON c.name='Mode'
WHERE v.title='S7 Katoenen T-shirt Basic'
  AND NOT EXISTS (
    SELECT 1 FROM pc_product_category x WHERE x.product_id=p.id AND x.category_id=c.id
  );
INSERT INTO pc_product_category (id, product_id, category_id, created_at, updated_at)
SELECT 'pcpc_s7_tshirt_acc', p.id, c.id, NOW(), NOW()
FROM pc_product p
JOIN product_version v ON v.product_id=p.id
JOIN pc_category c ON c.name='Tassen & Accessoires'
WHERE v.title='S7 Katoenen T-shirt Basic'
  AND NOT EXISTS (
    SELECT 1 FROM pc_product_category x WHERE x.product_id=p.id AND x.category_id=c.id
  );
"@ | Out-Null

$groups = @(
  @{ country='BE'; brand='S7 Brugge Atelier'; mfr='S7 Atelier Gent'; company='S7 Brugge Atelier BV' }
  @{ country='AT'; brand='S7 AlpenForm'; mfr='S7 Werk Graz'; company='S7 AlpenForm GmbH' }
  @{ country='PT'; brand='S7 Atlantico'; mfr='S7 Oficina Porto'; company='S7 Atlantico Lda' }
  @{ country='SE'; brand='S7 Nordskog'; mfr='S7 Verkstad Malmo'; company='S7 Nordskog AB' }
  @{ country='DK'; brand='S7 HavnDesign'; mfr='S7 Vaerksted Aarhus'; company='S7 HavnDesign ApS' }
  @{ country='CZ'; brand='S7 Bohemia Craft'; mfr='S7 Dilna Brno'; company='S7 Bohemia Craft sro' }
)

$brandCtx = @{}
foreach ($g in $groups) {
  Write-Host "--- Partner + brand $($g.brand) ($($g.country)) ---"
  $email = "s7x-$($g.country.ToLower())-$ts@example.com"
  $token = New-Customer $email "Producer"
  $onb = Onboard-Partner $token $g.company $g.country
  $approve = Invoke-Json "$backend/admin/partners/$($onb.id)/approve" "POST" $adminH "{}"
  if ($approve.status -ne 200) { throw "approve $($g.brand) $($approve.raw)" }
  $brand = Ensure-Brand $token $g.brand
  $brandCtx[$g.country] = @{ token=$token; brand=$brand; mfr=$g.mfr; brandName=$g.brand; country=$g.country }
  Write-Host "Brand ready: $($brand.id)"
}

$catalog = @(
  @{ c='BE'; title='S7 Chocolade Maker Kit'; desc='Demo EU-made BE kitchen kit.'; cats=@('Keuken','Huishouden','Cadeaus'); price=64.95 }
  @{ c='BE'; title='S7 Linnen Keukenschort'; desc='Demo EU-made BE apron.'; cats=@('Keuken','Mode','Huishouden'); price=34.95 }
  @{ c='BE'; title='S7 Fietsmand Wilgentenen'; desc='Demo EU-made BE bike basket.'; cats=@('Outdoor','Sport','Ambacht'); price=54.95 }
  @{ c='BE'; title='S7 Speelgoed Houten Blokken'; desc='Demo EU-made BE toy blocks.'; cats=@('Speelgoed','Baby & Kind','Ambacht'); price=39.95 }

  @{ c='AT'; title='S7 Ski Wax Set Alpine'; desc='Demo EU-made AT ski care.'; cats=@('Sport','Outdoor'); price=29.95 }
  @{ c='AT'; title='S7 Wantenset Merino'; desc='Demo EU-made AT gloves.'; cats=@('Mode','Sport','Outdoor'); price=44.95 }
  @{ c='AT'; title='S7 Houten Snijplank Beuk'; desc='Demo EU-made AT cutting board.'; cats=@('Keuken','Huishouden','Ambacht'); price=49.95 }
  @{ c='AT'; title='S7 Wandlamp Metaal'; desc='Demo EU-made AT wall lamp.'; cats=@('Wonen','Verlichting'); price=89.95 }

  @{ c='PT'; title='S7 Kurken Yogablok'; desc='Demo EU-made PT yoga block.'; cats=@('Sport','Outdoor'); price=24.95 }
  @{ c='PT'; title='S7 Keramiek Saladekom'; desc='Demo EU-made PT salad bowl.'; cats=@('Keuken','Wonen','Ambacht'); price=36.95 }
  @{ c='PT'; title='S7 Linnen Strandtas'; desc='Demo EU-made PT beach bag.'; cats=@('Tassen & Accessoires','Mode','Outdoor'); price=42.95 }
  @{ c='PT'; title='S7 Espadrille Canvas'; desc='Demo EU-made PT espadrille.'; cats=@('Schoenen','Mode'); price=59.95 }

  @{ c='SE'; title='S7 Berkenhout Kapstok'; desc='Demo EU-made SE coat rack.'; cats=@('Wonen','Ambacht'); price=119.95 }
  @{ c='SE'; title='S7 Outdoor Thermos 1L'; desc='Demo EU-made SE thermos.'; cats=@('Outdoor','Sport','Keuken'); price=39.95 }
  @{ c='SE'; title='S7 Wollen Sloffen'; desc='Demo EU-made SE slippers.'; cats=@('Schoenen','Mode','Wonen'); price=49.95 }
  @{ c='SE'; title='S7 LED Strip Warm 5m'; desc='Demo EU-made SE LED strip.'; cats=@('Elektronica','Verlichting','Wonen'); price=32.95 }

  @{ c='DK'; title='S7 Design Stoel Eiken'; desc='Demo EU-made DK chair.'; cats=@('Wonen','Ambacht'); price=299.95 }
  @{ c='DK'; title='S7 Keramiek Mok Set 4'; desc='Demo EU-made DK mugs.'; cats=@('Keuken','Wonen','Huishouden'); price=45.95 }
  @{ c='DK'; title='S7 Regenjas Urban'; desc='Demo EU-made DK raincoat.'; cats=@('Mode','Outdoor','Sport'); price=139.95 }
  @{ c='DK'; title='S7 Bluetooth Speaker Mini'; desc='Demo EU-made DK speaker.'; cats=@('Elektronica','Outdoor'); price=79.95 }

  @{ c='CZ'; title='S7 Kristal Vaas Klein'; desc='Demo EU-made CZ vase.'; cats=@('Wonen','Cadeaus','Ambacht'); price=69.95 }
  @{ c='CZ'; title='S7 Gereedschapset 56-delig'; desc='Demo EU-made CZ tool set.'; cats=@('Klus & Gereedschap','Huishouden'); price=89.95 }
  @{ c='CZ'; title='S7 Hardloopbroek Light'; desc='Demo EU-made CZ running tights.'; cats=@('Sport','Mode'); price=54.95 }
  @{ c='CZ'; title='S7 Kinderhelm Fiets'; desc='Demo EU-made CZ kids helmet.'; cats=@('Sport','Baby & Kind','Outdoor'); price=47.95 }
)

$created = @()
$eanBase = [int64](Get-Random -Minimum 200000000 -Maximum 800000000)
$i = 0
foreach ($row in $catalog) {
  $i++
  $ctx = $brandCtx[$row.c]
  Write-Host ("[{0}/{1}] {2}" -f $i, $catalog.Count, $row.title)
  $p = New-DemoProduct $ctx.token $ctx.brand.id $ctx.mfr $row.title $row.desc $row.cats $row.price ($eanBase + $i)
  $p.country = $row.c
  $p.brand_name = $ctx.brandName
  $created += $p
}

$verifiedIds = ($created | Select-Object -First 12).product_id
$idList = ($verifiedIds | ForEach-Object { "'$_'" }) -join ","
Write-Host "=== Mark Verified on $($verifiedIds.Count) new products ==="
$sql = "UPDATE pc_product SET lifecycle_status = E'Verified\u2122' WHERE id IN ($idList);"
docker exec europmade-postgres psql -U europmade -d europmade -c $sql | Out-Null

$manifestPath = Join-Path $PSScriptRoot 'seed-sprint7-demo-expand-manifest.json'
$created | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "Created expansion products: $($created.Count)"
Write-Host '=== Sprint 7 demo EXPAND DONE ==='
