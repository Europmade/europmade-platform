# Sprint 7 demo data — EU-made products for search/filters/Product Finder validation.
# Uses existing store/admin APIs (same pattern as scripts/e2e-*.ps1).
# Minimal SQL only for: brand_id relink after brand create, Verified™ lifecycle (no Verified API yet).
# Run: powershell -File scripts/seed-sprint7-demo-data.ps1

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
  $tmp = Join-Path $env:TEMP "s7-$docType-$ts-$([guid]::NewGuid().ToString('N').Substring(0,6)).pdf"
  [System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
  $out = curl.exe -s -w "`n%{http_code}" -X POST "$backend/store/partner-onboarding/documents" -H "Authorization: Bearer $token" -H "x-publishable-api-key: $pubKey" -F "file=@$tmp;type=application/pdf;filename=$docType.pdf" -F "document_type=$docType"
  $code = (($out -split "`n") | Where-Object { $_ -ne "" })[-1]
  if ($code -notin @("200","201")) { throw "upload $docType failed $out" }
}

function Onboard-Partner($token, $isRetailer, $isProducer, $companyName, $country) {
  $kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
  $vat = "{0}{1}B01" -f $country, (Get-Random -Minimum 100000000 -Maximum 999999999)
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $start = Invoke-Json "$backend/store/partner-onboarding" "POST" $h (@{ is_retailer=$isRetailer; is_producer_or_brand_owner=$isProducer; is_distributor=$false } | ConvertTo-Json -Compress)
  if ($start.status -notin 200,201) { throw "start $($start.raw)" }
  $patchJson = @{
    is_retailer=$isRetailer; is_producer_or_brand_owner=$isProducer; is_distributor=$false
    company=@{ legal_name=$companyName; chamber_of_commerce_number=$kvk; vat_number=$vat; country_code=$country; iban="NL91ABNA0417164300" }
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

function Ensure-Brand($token, $brandName, $adminH) {
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  # Seed product so prepare-access exists for free-text brand, then materialize brand record.
  $ean = "8{0:D12}" -f (Get-Random -Minimum 100000000000 -Maximum 999999999999)
  $seed = Invoke-Json "$backend/store/product-cloud/products" "POST" $h (@{
    brand_id=$brandName; manufacturer_id="$brandName Works"; title="S7 Brand Seed $brandName $ts"
    description="Development seed product for brand materialization. Not for sale claims."
    category_name="Algemeen"; category_names=@("Algemeen"); identifier_type="GTIN"; identifier_value=$ean
    create_as_retailer=$true
    media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://s7-seed-$ts.jpg" })
  } | ConvertTo-Json -Depth 5 -Compress)
  if ($seed.status -ne 201) { throw "brand seed create $($seed.raw)" }
  $seedProductId = $seed.json.product_id
  $seedVersionId = $seed.json.version_id
  Invoke-Json "$backend/store/product-cloud/products/$seedProductId/versions/$seedVersionId/submit" "POST" $h "{}" | Out-Null
  Invoke-Json "$backend/store/product-cloud/products/$seedProductId/versions/$seedVersionId/publish" "POST" $h "{}" | Out-Null

  $encoded = [uri]::EscapeDataString($brandName)
  $patch = Invoke-Json "$backend/store/brands/$encoded" "PATCH" $h (@{
    intro="Sprint 7 development demo brand ($brandName). EU production via partner company."
    story="Demo-only brand record for EuropMade Sprint 7 search validation."
  } | ConvertTo-Json -Compress)
  if ($patch.status -ne 200) { throw "brand patch $($patch.raw)" }

  $list = Invoke-Json "$backend/store/brands" "GET" $h $null
  if ($list.status -ne 200) { throw "brands list $($list.raw)" }
  $brand = $list.json.brands | Where-Object { $_.name -eq $brandName -or $_.id -eq $brandName } | Select-Object -First 1
  if (-not $brand) {
    $brand = $list.json.brands | Where-Object { $_.name -like "*$brandName*" } | Select-Object -First 1
  }
  if (-not $brand) { throw "brand not found after create: $brandName / $($list.raw)" }

  # Relink seed product to real brand id so country resolves.
  docker exec europmade-postgres psql -U europmade -d europmade -c "UPDATE pc_product SET brand_id='$($brand.id)' WHERE id='$seedProductId';" | Out-Null
  return $brand
}

function New-DemoProduct($token, $brandId, $manufacturerName, $title, $description, $categories, $price, $eanSuffix) {
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $ean = "87{0:D11}" -f ([int64]$eanSuffix)
  $primary = $categories[0]
  $body = @{
    brand_id=$brandId
    manufacturer_id=$manufacturerName
    title=$title
    description=$description
    category_name=$primary
    category_names=$categories
    identifier_type="GTIN"
    identifier_value=$ean
    create_as_retailer=$true
    media=@(@{ media_type="Hoofdafbeelding"; storage_reference="upload://s7-demo-$eanSuffix.jpg" })
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

  # Ensure all categories linked (idempotent add).
  if ($categories.Count -gt 1) {
    $patchCats = Invoke-Json "$backend/store/product-cloud/products/$productId" "PATCH" $h (@{ category_names=$categories } | ConvertTo-Json -Compress)
    if ($patchCats.status -ne 200) { throw "categories $title $($patchCats.raw)" }
  }

  $offer = Invoke-Json "$backend/store/commerce-cloud/offers" "POST" $h (@{
    identifier_id=$identifierId; region_code="NL"; quantity_available=25
    base_price=[math]::Round($price * 0.9, 2); shipping_cost=[math]::Round($price * 0.1, 2); vat_rate=0.21
  } | ConvertTo-Json -Compress)
  if ($offer.status -ne 201) { throw "offer $title $($offer.raw)" }

  return @{
    product_id=$productId
    title=$title
    brand_id=$brandId
    manufacturer=$manufacturerName
    categories=$categories
    price=$price
    ean=$ean
  }
}

Write-Host "=== Sprint 7 demo data seed ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
if ($bh -ne "200") { throw "backend health $bh" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email=$adminEmail; password=$adminPass } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

# Demo brands: clearly labeled development brands; production country = partner company country (EU).
$groups = @(
  @{ country='NL'; brand='S7 PolderCraft'; mfr='S7 Werkplaats Utrecht'; company='S7 PolderCraft BV' }
  @{ country='DE'; brand='S7 RheinWerk'; mfr='S7 Fertigung Muenchen'; company='S7 RheinWerk GmbH' }
  @{ country='FR'; brand='S7 Atelier Loire'; mfr='S7 Usine Nantes'; company='S7 Atelier Loire SAS' }
  @{ country='IT'; brand='S7 Bottega Verde'; mfr='S7 Fabbrica Brescia'; company='S7 Bottega Verde SRL' }
  @{ country='ES'; brand='S7 Casa Iberica'; mfr='S7 Taller Valencia'; company='S7 Casa Iberica SL' }
  @{ country='PL'; brand='S7 Baltic Form'; mfr='S7 Zaklad Gdansk'; company='S7 Baltic Form Spzoo' }
)

$brandCtx = @{}
foreach ($g in $groups) {
  Write-Host "--- Partner + brand $($g.brand) ($($g.country)) ---"
  $email = "s7-$($g.country.ToLower())-$ts@example.com"
  $token = New-Customer $email "Producer"
  $onb = Onboard-Partner $token $true $true $g.company $g.country
  $approve = Invoke-Json "$backend/admin/partners/$($onb.id)/approve" "POST" $adminH "{}"
  if ($approve.status -ne 200) { throw "approve $($g.brand) $($approve.raw)" }
  $brand = Ensure-Brand $token $g.brand $adminH
  $brandCtx[$g.country] = @{ token=$token; brand=$brand; mfr=$g.mfr; brandName=$g.brand; country=$g.country }
  Write-Host "Brand ready: $($brand.id) $($brand.name)"
}

# 30 distinct demo products (titles searchable; multi-category intentional).
$catalog = @(
  @{ c='NL'; title='S7 Heggenschaar Pro 60cm'; desc='Elektrische heggenschaar voor middelgrote tuinen. Demo product EU-made NL.'; cats=@('Tuin','Heggenscharen','Klus & Gereedschap'); price=79.95 }
  @{ c='NL'; title='S7 Tuinhandschoenen Leder Set'; desc='Werkhandschoenen voor snoeien en planten. Demo product EU-made NL.'; cats=@('Tuin','Outdoor'); price=19.95 }
  @{ c='NL'; title='S7 Moestuinbak Lariks 120cm'; desc='Houten moestuinbak voor balkon of tuin. Demo product EU-made NL.'; cats=@('Tuin','Wonen','Outdoor'); price=149.95 }
  @{ c='NL'; title='S7 Gietersets Keramiek 3-delig'; desc='Keramische gieter set voor kamerplanten. Demo product EU-made NL.'; cats=@('Tuin','Wonen','Plant & Bloem'); price=49.95 }
  @{ c='NL'; title='S7 Keukenmes Santoku 18cm'; desc='Roestvrijstalen santoku voor dagelijks koken. Demo product EU-made NL.'; cats=@('Keuken','Huishouden'); price=59.95 }

  @{ c='DE'; title='S7 Inductiekookplaat Compact'; desc='Tweepits inductiekookplaat voor kleine keukens. Demo product EU-made DE.'; cats=@('Keuken','Elektronica','Huishouden'); price=249.95 }
  @{ c='DE'; title='S7 Accuboormachine 18V Kit'; desc='Boormachine met 2 accus en koffer. Demo product EU-made DE.'; cats=@('Klus & Gereedschap','Elektronica'); price=129.95 }
  @{ c='DE'; title='S7 LED Desk Lamp Dimbaar'; desc='Bureaulamp met warm/koud licht. Demo product EU-made DE.'; cats=@('Elektronica','Kantoor','Verlichting'); price=39.95 }
  @{ c='DE'; title='S7 Bluetooth Headset Office'; desc='Headset voor calls en focuswerk. Demo product EU-made DE.'; cats=@('Elektronica','Kantoor'); price=89.95 }
  @{ c='DE'; title='S7 Stofzuiger Zakloos Eco'; desc='Zakloze stofzuiger voor hardhout en tapijt. Demo product EU-made DE.'; cats=@('Huishouden','Elektronica'); price=199.95 }

  @{ c='FR'; title='S7 Linnen Beddengoed Set 240'; desc='Linnen dekbedovertrekset. Demo product EU-made FR.'; cats=@('Wonen','Slaapkamer','Mode'); price=119.95 }
  @{ c='FR'; title='S7 Keramiek Servies 12-delig'; desc='Servies voor dagelijks gebruik. Demo product EU-made FR.'; cats=@('Keuken','Wonen','Huishouden'); price=99.95 }
  @{ c='FR'; title='S7 Wollen Plaid Merino'; desc='Merino plaid voor bank of bed. Demo product EU-made FR.'; cats=@('Wonen','Mode'); price=79.95 }
  @{ c='FR'; title='S7 Geurkaars Lavendel Pot'; desc='Lavendelgeurkaars in keramieke pot. Demo product EU-made FR.'; cats=@('Wonen','Beauty & Verzorging','Cadeaus'); price=24.95 }
  @{ c='FR'; title='S7 Espressokan RVS 6-kops'; desc='Roestvrijstalen espressokan. Demo product EU-made FR.'; cats=@('Keuken','Huishouden'); price=34.95 }

  @{ c='IT'; title='S7 Leren Sneaker Milano'; desc='Leren sneaker voor dagelijks gebruik. Demo product EU-made IT.'; cats=@('Schoenen','Mode'); price=129.95 }
  @{ c='IT'; title='S7 Katoenen T-shirt Basic'; desc='Biologisch katoenen T-shirt. Demo product EU-made IT.'; cats=@('Mode'); price=29.95 }
  @{ c='IT'; title='S7 Kinderrugzak Canvas'; desc='Canvas rugzak voor school. Demo product EU-made IT.'; cats=@('Baby & Kind','Tassen & Accessoires','Mode'); price=44.95 }
  @{ c='IT'; title='S7 Yogamat Kurk 5mm'; desc='Kurken yogamat met antislip. Demo product EU-made IT.'; cats=@('Sport','Outdoor'); price=54.95 }
  @{ c='IT'; title='S7 Fietshelm Urban'; desc='Stadsfietshelm met LED-clip. Demo product EU-made IT.'; cats=@('Sport','Outdoor'); price=69.95 }

  @{ c='ES'; title='S7 Keramiek Olijfoliekan'; desc='Olijfoliekan met schenktuit. Demo product EU-made ES.'; cats=@('Keuken','Ambacht'); price=27.95 }
  @{ c='ES'; title='S7 Terracotta Bloempot Set'; desc='Set van 3 terracotta potten. Demo product EU-made ES.'; cats=@('Tuin','Wonen','Plant & Bloem'); price=32.95 }
  @{ c='ES'; title='S7 Outdoor Picknickkleed'; desc='Waterafstotend picknickkleed. Demo product EU-made ES.'; cats=@('Outdoor','Sport','Tuin'); price=39.95 }
  @{ c='ES'; title='S7 Kurk Onderzetters 6-pack'; desc='Kurken onderzetters. Demo product EU-made ES.'; cats=@('Keuken','Wonen','Ambacht'); price=19.95 }
  @{ c='ES'; title='S7 Baby Rompertjes 3-pack'; desc='Katoenen rompertjes. Demo product EU-made ES.'; cats=@('Baby & Kind','Mode'); price=22.95 }

  @{ c='PL'; title='S7 Staande Lamp Eiken'; desc='Eiken staande lamp. Demo product EU-made PL.'; cats=@('Wonen','Verlichting'); price=159.95 }
  @{ c='PL'; title='S7 Speelgoed Houten Trein'; desc='Houten trein set. Demo product EU-made PL.'; cats=@('Speelgoed','Baby & Kind','Ambacht'); price=49.95 }
  @{ c='PL'; title='S7 Hardloopschoen Trail'; desc='Trail hardloopschoen. Demo product EU-made PL.'; cats=@('Sport','Schoenen'); price=109.95 }
  @{ c='PL'; title='S7 Rugzak Weekend 30L'; desc='Weekendrugzak 30 liter. Demo product EU-made PL.'; cats=@('Outdoor','Sport','Tassen & Accessoires'); price=84.95 }
  @{ c='PL'; title='S7 Elektrische Heggenschaar Compact'; desc='Compacte heggenschaar voor hagen. Demo product EU-made PL.'; cats=@('Tuin','Heggenscharen','Klus & Gereedschap','Elektronica'); price=99.95 }
)

$created = @()
$eanBase = [int64](Get-Random -Minimum 100000000 -Maximum 900000000)
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

# Mark ~half as Verified (no dedicated Verified API yet — demo SQL on existing lifecycle field).
$verifiedIds = ($created | Select-Object -First 15).product_id
$idList = ($verifiedIds | ForEach-Object { "'$_'" }) -join ","
Write-Host "=== Mark Verified on $($verifiedIds.Count) products ==="
$sql = "UPDATE pc_product SET lifecycle_status = E'Verified\u2122' WHERE id IN ($idList);"
docker exec europmade-postgres psql -U europmade -d europmade -c $sql | Out-Null

# Write manifest for report
$manifestPath = Join-Path $PSScriptRoot 'seed-sprint7-demo-manifest.json'
$created | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "Manifest: $manifestPath"
Write-Host "Created products: $($created.Count)"
Write-Host '=== Sprint 7 demo data seed DONE ==='
