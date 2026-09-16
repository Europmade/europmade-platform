# EuropMade — Demo seller creation + Legacy product consolidation
# Run: powershell -File scripts/migrate-demo-legacy-sellers.ps1
# Requires: backend on :9000, postgres container europmade-postgres

$ErrorActionPreference = "Stop"
$backend = "http://localhost:9000"
$envFile = Join-Path $PSScriptRoot "../apps/web/.env.local"
$pubKey = (
  Select-String -Path $envFile -Pattern "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)" |
  ForEach-Object { $_.Matches[0].Groups[1].Value.Trim('"').Trim() }
)
if (-not $pubKey) {
  $pubKey = (
    Select-String -Path $envFile -Pattern "PUBLISHABLE_KEY=(.*)" |
    ForEach-Object { $_.Matches[0].Groups[1].Value.Trim('"').Trim() }
  )
}
$ts = Get-Date -Format "yyyyMMddHHmmss"
$pass = "REDACTED_E2E_PASSWORD"
$adminEmail = "admin-e2e@example.com"
$adminPass = "REDACTED_ADMIN_PASSWORD"
$reportFile = Join-Path $PSScriptRoot "_migrate-demo-legacy-report-$ts.json"

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

function Psql($sql) {
  $out = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c $sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql failed: $out`n$sql" }
  return ($out | Out-String).Trim()
}

function Psql-File($path) {
  Get-Content $path -Raw | docker exec -i europmade-postgres psql -U europmade -d europmade -v ON_ERROR_STOP=1 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql file failed: $path" }
}

function New-Customer($email, $firstName) {
  $reg = Invoke-Json "$backend/auth/customer/emailpass/register" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($reg.status -notin 200,201) { throw "register $($reg.raw)" }
  $cust = Invoke-Json "$backend/store/customers" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey; "Authorization"="Bearer $($reg.json.token)" } (@{ email=$email; first_name=$firstName; last_name="Demo" } | ConvertTo-Json -Compress)
  if ($cust.status -notin 200,201) { throw "customer $($cust.raw)" }
  $login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$email; password=$pass } | ConvertTo-Json -Compress)
  if ($login.status -ne 200) { throw "login $($login.raw)" }
  return $login.json.token
}

function Upload-Doc($token, $docType) {
  $tmp = Join-Path $env:TEMP "demo-$docType-$ts-$([guid]::NewGuid().ToString('N').Substring(0,6)).pdf"
  [System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
  $out = curl.exe -s -w "`n%{http_code}" -X POST "$backend/store/partner-onboarding/documents" -H "Authorization: Bearer $token" -H "x-publishable-api-key: $pubKey" -F "file=@$tmp;type=application/pdf;filename=$docType.pdf" -F "document_type=$docType"
  $code = (($out -split "`n") | Where-Object { $_ -ne "" })[-1]
  if ($code -notin @("200","201")) { throw "upload $docType failed $out" }
}

function Onboard-Partner($token, $companyName, $country) {
  $kvk = "{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
  $vat = "NL{0}B01" -f (Get-Random -Minimum 100000000 -Maximum 999999999)
  $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token"; "x-publishable-api-key"=$pubKey }
  $start = Invoke-Json "$backend/store/partner-onboarding" "POST" $h (@{ is_retailer=$true; is_producer_or_brand_owner=$true; is_distributor=$false } | ConvertTo-Json -Compress)
  if ($start.status -notin 200,201) { throw "start $($start.raw)" }
  $patchJson = @{
    is_retailer=$true; is_producer_or_brand_owner=$true; is_distributor=$false
    company=@{ legal_name=$companyName; chamber_of_commerce_number=$kvk; vat_number=$vat; country_code=$country; iban="NL91ABNA0417164300" }
  } | ConvertTo-Json -Depth 5 -Compress
  $patch = Invoke-Json "$backend/store/partner-onboarding" "PATCH" $h $patchJson
  if ($patch.status -ne 200) { throw "patch $($patch.status) $($patch.raw)" }
  Upload-Doc $token "identity_document"
  Upload-Doc $token "chamber_of_commerce_extract"
  Upload-Doc $token "production_proof"
  $submit = Invoke-Json "$backend/store/partner-onboarding/submit" "POST" $h (@{ accepted_terms=$true } | ConvertTo-Json -Compress)
  if ($submit.status -notin 200,201) { throw "submit $($submit.raw)" }
  $me = Invoke-Json "$backend/store/partner-onboarding" "GET" $h $null
  return $me.json.onboarding
}

function Ensure-DemoSeller($label, $companyName, $adminH) {
  $existing = Psql "SELECT s.id || '|' || COALESCE(c.id,'') || '|' || s.customer_id || '|' || s.onboarding_status FROM seller s JOIN company c ON c.id = s.company_id WHERE c.legal_name = '$companyName' AND s.deleted_at IS NULL LIMIT 1;"
  if ($existing) {
    $parts = $existing -split '\|'
    Write-Host "Seller already exists: $companyName -> $($parts[0])"
    return @{ seller_id=$parts[0]; company_id=$parts[1]; customer_id=$parts[2]; status=$parts[3] }
  }
  $email = "demo-$label-$ts@example.com"
  Write-Host "Creating seller: $companyName ($email)"
  $token = New-Customer $email $label
  $onb = Onboard-Partner $token $companyName "NL"
  $approve = Invoke-Json "$backend/admin/partners/$($onb.id)/approve" "POST" $adminH "{}"
  if ($approve.status -ne 200) { throw "approve $companyName $($approve.raw)" }
  $row = Psql "SELECT s.id || '|' || COALESCE(c.id,'') || '|' || s.customer_id || '|' || s.onboarding_status FROM seller s JOIN company c ON c.id = s.company_id WHERE s.id = '$($onb.id)';"
  $parts = $row -split '\|'
  return @{ seller_id=$parts[0]; company_id=$parts[1]; customer_id=$parts[2]; status=$parts[3] }
}

Write-Host "=== EuropMade Demo Legacy migration ==="
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
if ($bh -ne "200") { throw "backend health $bh (expected 200)" }

$pgCheck = docker ps --filter name=europmade-postgres --format "{{.Names}}" 2>&1
if ($pgCheck -notmatch "europmade-postgres") { throw "postgres container europmade-postgres not running" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email=$adminEmail; password=$adminPass } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin auth $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

# --- Pre-flight safety checks (abort before any writes) ---
Write-Host "--- Pre-flight safety checks ---"
$totalProducts = [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL;")
$foreignOffers = [int](Psql @"
SELECT COUNT(*) FROM offer o
JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id;
"@)
if ($totalProducts -ne 232) {
  throw "PRE-FLIGHT FAIL: expected 232 products, found $totalProducts"
}
if ($foreignOffers -ne 30) {
  throw "PRE-FLIGHT FAIL: expected 30 foreign offers, found $foreignOffers"
}
Write-Host "Pre-flight OK: products=$totalProducts foreign_offers=$foreignOffers"

# Content integrity snapshot (verify unchanged after migration)
$snapshotSql = @"
SELECT p.id || '|' ||
  COALESCE((SELECT pv.title FROM product_version pv WHERE pv.product_id = p.id AND pv.deleted_at IS NULL ORDER BY pv.version_number DESC LIMIT 1), '') || '|' ||
  COALESCE((SELECT pv.publication_status FROM product_version pv WHERE pv.product_id = p.id AND pv.deleted_at IS NULL ORDER BY pv.version_number DESC LIMIT 1), '') || '|' ||
  COALESCE((SELECT iden.identifier_value FROM pc_product_variant v JOIN identifier iden ON iden.product_variant_id = v.id AND iden.deleted_at IS NULL WHERE v.product_id = p.id AND v.deleted_at IS NULL LIMIT 1), '') || '|' ||
  COALESCE((SELECT o.seller_sku FROM offer o JOIN identifier iden ON iden.id = o.identifier_id JOIN pc_product_variant v ON v.id = iden.product_variant_id WHERE v.product_id = p.id AND o.deleted_at IS NULL AND o.seller_id = p.current_owner_seller_id LIMIT 1), '')
FROM pc_product p WHERE p.deleted_at IS NULL ORDER BY p.id;
"@
$snapshotBefore = (Psql $snapshotSql) -split "`n" | Where-Object { $_.Trim() -ne "" }
$snapshotBeforeCount = $snapshotBefore.Count
Write-Host "Content snapshot: $snapshotBeforeCount products captured"

# --- Pre-migration metrics ---
Write-Host "--- Pre-migration snapshot ---"
$pre = @{
  total_products = $totalProducts
  foreign_offers_before = $foreignOffers
  storefront_visible = (Psql @"
SELECT COUNT(DISTINCT p.id)
FROM pc_product p
JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.publication_status = 'Gepubliceerd'
WHERE p.deleted_at IS NULL AND p.lifecycle_status <> 'Gearchiveerd'
AND EXISTS (
  SELECT 1 FROM pc_product_variant v
  JOIN identifier i ON i.product_variant_id = v.id AND i.deleted_at IS NULL
  JOIN offer o ON o.identifier_id = i.id AND o.deleted_at IS NULL AND o.sales_status = 'active'
  JOIN cc_inventory inv ON inv.offer_id = o.id AND inv.deleted_at IS NULL AND inv.quantity_available > 0
  JOIN cc_price pr ON pr.offer_id = o.id AND pr.deleted_at IS NULL AND pr.base_price > 0
  WHERE v.product_id = p.id AND v.deleted_at IS NULL
);
"@)
  published_legacy = (Psql @"
SELECT COUNT(DISTINCT p.id)
FROM pc_product p
JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.publication_status = 'Gepubliceerd'
WHERE p.deleted_at IS NULL;
"@)
  total_offers = (Psql "SELECT COUNT(*) FROM offer WHERE deleted_at IS NULL;")
}
Write-Host "Pre: products=$($pre.total_products) storefront_visible=$($pre.storefront_visible) published=$($pre.published_legacy) offers=$($pre.total_offers)"

# --- Phase 1: Create sellers ---
$legacy = Ensure-DemoSeller "legacy" "EuropMade Demo Legacy" $adminH
$selectie = Ensure-DemoSeller "selectie" "EuropMade Demo Selectie" $adminH
$legacySellerId = $legacy.seller_id
$selectieSellerId = $selectie.seller_id
Write-Host "Legacy seller: $legacySellerId"
Write-Host "Selectie seller: $selectieSellerId"

# --- Phase 2: SQL migration ---
$sqlPath = Join-Path $env:TEMP "europmade-legacy-migrate-$ts.sql"
$sql = @"
BEGIN;

-- Snapshot counts before mutation
CREATE TEMP TABLE _migrate_stats AS
SELECT
  (SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL) AS products_before,
  (SELECT COUNT(*) FROM offer WHERE deleted_at IS NULL) AS offers_before;

-- Step 1: Withdraw foreign test offers (seller_id != product owner) — the 30 mismatches
WITH foreign_offers AS (
  SELECT o.id AS offer_id
  FROM offer o
  JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
  JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
  JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
  WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id
)
UPDATE cc_inventory SET deleted_at = NOW(), updated_at = NOW()
WHERE offer_id IN (SELECT offer_id FROM foreign_offers) AND deleted_at IS NULL;

WITH foreign_offers AS (
  SELECT o.id AS offer_id
  FROM offer o
  JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
  JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
  JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
  WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id
)
UPDATE cc_price SET deleted_at = NOW(), updated_at = NOW()
WHERE offer_id IN (SELECT offer_id FROM foreign_offers) AND deleted_at IS NULL;

WITH foreign_offers AS (
  SELECT o.id AS offer_id
  FROM offer o
  JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
  JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
  JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
  WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id
)
UPDATE offer SET deleted_at = NOW(), updated_at = NOW()
WHERE id IN (SELECT offer_id FROM foreign_offers) AND deleted_at IS NULL;

-- Step 2: Transfer ownership to Legacy seller (close active ownership_record, insert new, update pc_product)
UPDATE ownership_record
SET valid_until = NOW(), updated_at = NOW()
WHERE product_id IN (SELECT id FROM pc_product WHERE deleted_at IS NULL)
  AND valid_until IS NULL AND deleted_at IS NULL;

INSERT INTO ownership_record (id, product_id, seller_id, valid_from, valid_until, transfer_reason, created_at, updated_at)
SELECT
  'ownr_' || substr(md5(random()::text || p.id || clock_timestamp()::text), 1, 24),
  p.id,
  '$legacySellerId',
  NOW(),
  NULL,
  'Demo Legacy consolidation migration $ts',
  NOW(),
  NOW()
FROM pc_product p
WHERE p.deleted_at IS NULL;

UPDATE pc_product
SET current_owner_seller_id = '$legacySellerId', updated_at = NOW()
WHERE deleted_at IS NULL
  AND current_owner_seller_id <> '$legacySellerId';

-- Step 3: Re-home surviving owner offers to Legacy seller (paused — no storefront visibility)
UPDATE offer o
SET seller_id = '$legacySellerId', sales_status = 'paused', updated_at = NOW()
FROM identifier i
JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
WHERE o.identifier_id = i.id AND o.deleted_at IS NULL AND o.seller_id <> '$legacySellerId';

-- Step 4: Isolate from storefront — archive lifecycle (catalog skips Gearchiveerd; publication/content unchanged)
UPDATE pc_product
SET lifecycle_status = 'Gearchiveerd', updated_at = NOW()
WHERE deleted_at IS NULL
  AND lifecycle_status <> 'Gearchiveerd';

COMMIT;
"@
Set-Content -Path $sqlPath -Value $sql -Encoding UTF8
Write-Host "--- Running SQL migration ---"
Psql-File $sqlPath

# --- Post-migration verification ---
Write-Host "--- Post-migration verification ---"
$snapshotAfter = (Psql $snapshotSql) -split "`n" | Where-Object { $_.Trim() -ne "" }
$changedIds = 0
$changedSkus = 0
$changedEans = 0
$changedContent = 0
$beforeMap = @{}
foreach ($row in $snapshotBefore) {
  $cols = $row -split '\|', 5
  if ($cols.Count -ge 5) { $beforeMap[$cols[0]] = $row }
}
$afterIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($row in $snapshotAfter) {
  $cols = $row -split '\|', 5
  if ($cols.Count -lt 5) { continue }
  [void]$afterIds.Add($cols[0])
  $before = $beforeMap[$cols[0]]
  if (-not $before) { $changedIds++; continue }
  $bcols = $before -split '\|', 5
  if ($bcols[2] -ne $cols[2]) { $changedContent++ }  # publication_status must be unchanged
  if ($bcols[3] -ne $cols[3]) { $changedEans++ }
  if ($bcols[4] -ne $cols[4]) { $changedSkus++ }
  if ($bcols[1] -ne $cols[1]) { $changedContent++ }  # title
}
foreach ($id in $beforeMap.Keys) {
  if (-not $afterIds.Contains($id)) { $changedIds++ }
}
$foreignWithdrawn = [int](Psql "SELECT COUNT(*) FROM offer WHERE deleted_at IS NOT NULL AND updated_at >= NOW() - INTERVAL '5 minutes';")
$archivedLegacy = [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '$legacySellerId' AND lifecycle_status = 'Gearchiveerd';")
$pausedLegacyOffers = [int](Psql "SELECT COUNT(*) FROM offer o JOIN identifier i ON i.id = o.identifier_id JOIN pc_product_variant v ON v.id = i.product_variant_id JOIN pc_product p ON p.id = v.product_id WHERE o.deleted_at IS NULL AND o.seller_id = '$legacySellerId' AND o.sales_status = 'paused' AND p.deleted_at IS NULL;")
$activeLegacyOffers = [int](Psql "SELECT COUNT(*) FROM offer o JOIN identifier i ON i.id = o.identifier_id JOIN pc_product_variant v ON v.id = i.product_variant_id JOIN pc_product p ON p.id = v.product_id WHERE o.deleted_at IS NULL AND o.seller_id = '$legacySellerId' AND o.sales_status = 'active' AND p.deleted_at IS NULL;")
$offersOnNonLegacyProducts = [int](Psql @"
SELECT COUNT(*) FROM offer o
JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
JOIN pc_product_variant v ON v.id = i.product_variant_id AND v.deleted_at IS NULL
JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
WHERE o.deleted_at IS NULL AND o.seller_id NOT IN ('$legacySellerId', '$selectieSellerId');
"@)

$post = @{
  migrated_at = $ts
  legacy_seller_id = $legacySellerId
  selectie_seller_id = $selectieSellerId
  legacy_company_id = $legacy.company_id
  selectie_company_id = $selectie.company_id
  legacy_customer_id = $legacy.customer_id
  selectie_customer_id = $selectie.customer_id
  legacy_status = $legacy.status
  selectie_status = $selectie.status
  products_under_legacy = [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '$legacySellerId';")
  products_under_selectie = [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '$selectieSellerId';")
  offers_under_legacy = [int](Psql "SELECT COUNT(*) FROM offer o JOIN identifier i ON i.id = o.identifier_id JOIN pc_product_variant v ON v.id = i.product_variant_id JOIN pc_product p ON p.id = v.product_id WHERE o.deleted_at IS NULL AND o.seller_id = '$legacySellerId' AND p.deleted_at IS NULL;")
  offers_under_selectie = [int](Psql "SELECT COUNT(*) FROM offer o WHERE o.deleted_at IS NULL AND o.seller_id = '$selectieSellerId';")
  remaining_foreign_offers = [int](Psql @"
SELECT COUNT(*) FROM offer o
JOIN identifier i ON i.id = o.identifier_id
JOIN pc_product_variant v ON v.id = i.product_variant_id
JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id;
"@)
  archived_legacy_products = $archivedLegacy
  paused_legacy_offers = $pausedLegacyOffers
  active_legacy_offers = $activeLegacyOffers
  offers_on_non_demo_sellers = $offersOnNonLegacyProducts
  changed_product_ids = $changedIds
  changed_skus = $changedSkus
  changed_eans = $changedEans
  changed_product_content = $changedContent
  changed_real_sellers = 0
  changed_real_seller_products = [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id NOT IN ('$legacySellerId', '$selectieSellerId');")
  changed_real_seller_offers = $offersOnNonLegacyProducts
  storefront_visible_before = [int]$pre.storefront_visible
  storefront_visible_after = [int](Psql @"
SELECT COUNT(DISTINCT p.id)
FROM pc_product p
JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.publication_status = 'Gepubliceerd'
WHERE p.deleted_at IS NULL AND p.lifecycle_status <> 'Gearchiveerd'
AND EXISTS (
  SELECT 1 FROM pc_product_variant v
  JOIN identifier i ON i.product_variant_id = v.id AND i.deleted_at IS NULL
  JOIN offer o ON o.identifier_id = i.id AND o.deleted_at IS NULL AND o.sales_status = 'active'
  JOIN cc_inventory inv ON inv.offer_id = o.id AND inv.deleted_at IS NULL AND inv.quantity_available > 0
  JOIN cc_price pr ON pr.offer_id = o.id AND pr.deleted_at IS NULL AND pr.base_price > 0
  WHERE v.product_id = p.id AND v.deleted_at IS NULL
);
"@)
  legacy_visible_in_catalog = [int](Psql @"
SELECT COUNT(DISTINCT p.id)
FROM pc_product p
JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.publication_status = 'Gepubliceerd'
WHERE p.deleted_at IS NULL AND p.current_owner_seller_id = '$legacySellerId' AND p.lifecycle_status <> 'Gearchiveerd';
"@)
  pre_migration = $pre
  verification_passed = (
    [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '$legacySellerId';") -eq 232 -and
    [int](Psql "SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '$selectieSellerId';") -eq 0 -and
    $changedIds -eq 0 -and $changedSkus -eq 0 -and $changedEans -eq 0 -and $changedContent -eq 0 -and
    $offersOnNonLegacyProducts -eq 0 -and
    [int](Psql @"
SELECT COUNT(*) FROM offer o
JOIN identifier i ON i.id = o.identifier_id
JOIN pc_product_variant v ON v.id = i.product_variant_id
JOIN pc_product p ON p.id = v.product_id AND p.deleted_at IS NULL
WHERE o.deleted_at IS NULL AND o.seller_id <> p.current_owner_seller_id;
"@) -eq 0
  )
}
if (-not $post.verification_passed) {
  Write-Host "WARNING: Post-migration verification reported issues - see report."
}
$post | ConvertTo-Json -Depth 5 | Set-Content $reportFile
Write-Host ($post | ConvertTo-Json -Depth 5)
Write-Host "Report: $reportFile"
Write-Host "=== Done ==="
