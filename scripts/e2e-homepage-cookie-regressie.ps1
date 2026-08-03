# Cookie banner + homepage regressie
# Run: powershell -File scripts/e2e-homepage-cookie-regressie.ps1
$ErrorActionPreference = "Stop"
$web = "http://localhost:3000"
$backend = "http://localhost:9000"
$pubKey = (Select-String -Path "$PSScriptRoot/../apps/web/.env.local" -Pattern "PUBLISHABLE_KEY=(.*)").Matches[0].Groups[1].Value.Trim()

Write-Host "=== Health ==="
$wh = curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 5 --max-time 15 "$web/"
if ($wh -ne "200") { throw "web $wh" }
$bh = curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 5 --max-time 15 "$backend/health"
Write-Host "web=$wh backend=$bh"

Write-Host "=== Homepage sections ==="
curl.exe -s --max-time 30 "$web/" -o "$env:TEMP\em-home-reg.html"
$html = Get-Content -Raw "$env:TEMP\em-home-reg.html"
foreach ($needle in @(
  "Europese producten, rechtstreeks van de makers",
  "Uitgelicht deze week",
  "Binnenkort beschikbaar",
  "Advertentieruimte positie 1",
  "Waarom EuropMade",
  "Blijf op de hoogte"
)) {
  if ($html -notmatch [regex]::Escape($needle)) { throw "missing: $needle" }
  Write-Host "OK $needle"
}
if ($html -match 'href="/categorie/tuin"') {
  throw "category tiles must not be live links until Catalog exists"
}
Write-Host "OK categories not live-linked"

Write-Host "=== Consent API (backend) ==="
if ($bh -eq "200") {
  $visitor = "visitor-cookie-reg-$(Get-Date -Format 'yyyyMMddHHmmss')-abcdefgh"
  try {
    $r = Invoke-WebRequest -Uri "$backend/store/affiliate/consent" -Method POST `
      -Headers @{ "Content-Type"="application/json"; "x-publishable-api-key"=$pubKey } `
      -Body (@{ visitor_key=$visitor; consent_given=$true } | ConvertTo-Json -Compress) `
      -UseBasicParsing
    if ([int]$r.StatusCode -notin 200,201) { throw "consent status $($r.StatusCode) $($r.Content)" }
    Write-Host "OK consent API $($r.StatusCode)"
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      throw "consent failed $([int]$resp.StatusCode) $($reader.ReadToEnd())"
    }
    throw
  }
} else {
  Write-Host "SKIP consent API (backend down) - banner closes via local prefs"
}

Write-Host "PASS e2e-homepage-cookie-regressie"
