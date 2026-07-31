# S3-09-01/02 AI-ondersteuning — run: powershell -File scripts/e2e-s3-09-ai-support.ps1
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
$bh = curl.exe -s -o NUL -w "%{http_code}" "$backend/health"
$wh = curl.exe -s -o NUL -w "%{http_code}" "$web"
if ($bh -ne "200") { throw "backend $bh" }
if ($wh -ne "200") { throw "web $wh" }

Write-Host "=== Register/login regression ==="
$probe = "ai-auth-$ts@example.com"
$reg = Invoke-Json "$backend/auth/customer/emailpass/register" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probe; password=$pass } | ConvertTo-Json -Compress)
if ($reg.status -notin 200,201) { throw "auth register $($reg.raw)" }
$login = Invoke-Json "$backend/auth/customer/emailpass" "POST" @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } (@{ email=$probe; password=$pass } | ConvertTo-Json -Compress)
if ($login.status -ne 200) { throw "auth login $($login.raw)" }

$adminAuth = Invoke-Json "$backend/auth/user/emailpass" "POST" @{ "Content-Type"="application/json" } (@{ email="admin-e2e@example.com"; password="AdminTest123!" } | ConvertTo-Json -Compress)
if ($adminAuth.status -ne 200) { throw "admin $($adminAuth.raw)" }
$adminH = @{ "Authorization"="Bearer $($adminAuth.json.token)"; "Content-Type"="application/json" }

Write-Host "=== Schema ai_metadata ==="
$tables = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select tablename from pg_tables where schemaname='public' and tablename='ai_metadata';"
if ($tables -notmatch "ai_metadata") { throw "missing ai_metadata table" }

Write-Host "=== Open fraud case via affiliate click velocity path (seed case) ==="
# Direct generate against a moderation case: create via open fraud signal API path used by affiliate
# Use admin generate after inserting a case through existing fraud open from moderation workflow via API if available.
# Fallback: create affiliate fraud then read queue.

$aEmail = "aff-ai-$ts@example.com"
$aToken = New-Customer $aEmail "Affiliate"
$aH = @{ "Content-Type"="application/json"; "Authorization"="Bearer $aToken"; "x-publishable-api-key"=$pubKey }
$pubH = @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey }

$regAff = Invoke-Json "$backend/store/affiliate" "POST" $aH (@{
  channel_url="https://blog.example.com/ai-$ts"; legal_name="AI Aff $ts"
  iban="NL91ABNA0417164300"; country_code="NL"
  chamber_of_commerce_number=("{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999))
} | ConvertTo-Json -Compress)
if ($regAff.status -ne 201) { throw "aff reg $($regAff.raw)" }
$affId = $regAff.json.affiliate.id
Invoke-Json "$backend/admin/affiliates/$affId/approve" "POST" $adminH "{}" | Out-Null
$visitor = "visitor-ai-$ts-abcdefgh"
Invoke-Json "$backend/store/affiliate/consent" "POST" $pubH (@{ visitor_key=$visitor; consent_given=$true } | ConvertTo-Json -Compress) | Out-Null
$link = Invoke-Json "$backend/store/affiliate/links" "POST" $aH (@{ target_url="/p/ai-$ts" } | ConvertTo-Json -Compress)
if ($link.status -ne 201) { throw "link $($link.raw)" }
$tracking = $link.json.link.tracking_param
# Burst clicks to trigger fraud signal (ADR-0032)
for ($i = 0; $i -lt 25; $i++) {
  Invoke-Json "$backend/store/affiliate/clicks" "POST" $pubH (@{ tracking_param=$tracking; visitor_key="$visitor-$i" } | ConvertTo-Json -Compress) | Out-Null
}
Start-Sleep -Seconds 2

$fraude = Invoke-Json "$backend/admin/moderation/queues/fraude" "GET" $adminH $null
if ($fraude.status -ne 200) { throw "fraude queue $($fraude.raw)" }
$case = @($fraude.json.items) | Where-Object { $_.affiliate_id -eq $affId } | Select-Object -First 1
if (-not $case) {
  # fallback: any open fraude item
  $case = @($fraude.json.items) | Select-Object -First 1
}
if (-not $case) { throw "no fraude case after click burst $($fraude.raw)" }
$caseId = $case.id

Write-Host "=== Generate recommendation API ==="
$gen = Invoke-Json "$backend/admin/ai-support/recommendations" "POST" $adminH (@{
  subject_type="moderation_case"; subject_id=$caseId
} | ConvertTo-Json -Compress)
if ($gen.status -notin 200,201) { throw "generate $($gen.raw)" }
if (-not $gen.json.ai_metadata) { throw "missing ai_metadata" }
$score = [double]$gen.json.ai_metadata.confidence_score
if ($score -le 0 -or $score -gt 1) { throw "invalid confidence_score $score" }
$expl = [string]$gen.json.ai_metadata.explanation
if ($expl -match "keur goed|automatisch goedgekeurd|besluit:") { throw "decision language in advice: $expl" }
if ($gen.json.label -notmatch "mens beslist") { throw "missing human-decides label" }

Write-Host "=== Detail includes AI box fields ==="
$detail = Invoke-Json "$backend/admin/moderation/queues/fraude/$caseId" "GET" $adminH $null
if ($detail.status -ne 200) { throw "detail $($detail.raw)" }
if (-not $detail.json.detail.ai_metadata) { throw "detail missing ai_metadata $($detail.raw)" }
if ($null -eq $detail.json.detail.ai_metadata.confidence_percent) { throw "missing confidence_percent" }

$db = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select confidence_score::text, recommendation_type from ai_metadata where subject_id='$caseId' limit 1;"
if (-not $db) { throw "ai_metadata row missing in db" }

$linked = docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "select ai_metadata_id from moderation_case where id='$caseId';"
if (-not $linked) { throw "moderation_case.ai_metadata_id not set" }

Write-Host "=== Admin UI route ==="
$ui = curl.exe -s -o NUL -w "%{http_code}" "$admin/moderation/fraude/$caseId"
if ($ui -ne "200") {
  $ui2 = curl.exe -s -o NUL -w "%{http_code}" -L "$admin/login"
  Write-Host "moderation detail http=$ui login=$ui2 (detail may redirect when unauthenticated)"
} else {
  Write-Host "OK UI moderation detail"
}

Write-Host "PASS e2e-s3-09-ai-support case=$caseId score=$score"
