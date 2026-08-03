# Cookie banner + homepage + listing regressie
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
  "Populaire categorieën",
  "Advertentieruimte positie 1",
  "Waarom EuropMade",
  "Blijf op de hoogte"
)) {
  if ($html -notmatch [regex]::Escape($needle)) { throw "missing: $needle" }
  Write-Host "OK $needle"
}
if ($html -notmatch 'href="/categorie/tuin"') {
  throw "category tiles must link to /categorie/{slug}"
}
Write-Host "OK category tiles live-linked"

Write-Host "=== Listing pages ==="
curl.exe -s --max-time 30 "$web/zoeken?q=robotmaaier" -o "$env:TEMP\em-zoek-reg.html"
$zoek = Get-Content -Raw "$env:TEMP\em-zoek-reg.html"
if ($zoek -notmatch "Zoekresultaten voor") { throw "search title missing" }
if ($zoek -notmatch "noindex") { throw "search must be noindex" }
if ($zoek -notmatch "Binnenkort beschikbaar") { throw "search empty/pending state missing" }
if ($zoek -notmatch "Paginering") { throw "search pagination chrome missing" }
Write-Host "OK /zoeken (noindex + pending + pagination)"

curl.exe -s --max-time 30 "$web/categorie" -o "$env:TEMP\em-cat-index-reg.html"
$catIndex = Get-Content -Raw "$env:TEMP\em-cat-index-reg.html"
if ($catIndex -notmatch "Categorieën") { throw "category index title missing" }
if ($catIndex -notmatch "Populaire categorieën") { throw "category index popular section missing" }
if ($catIndex -notmatch "Alle categorieën") { throw "category index all section missing" }
if ($catIndex -notmatch 'href="/categorie/keuken"') { throw "category index missing Keuken" }
if ($catIndex -notmatch "Advertentie") { throw "category index ad slot missing" }
if ($catIndex -notmatch "NL · €") { throw "header locale/currency missing" }
if ($catIndex -notmatch "Hoofdnavigatie") { throw "header nav missing" }
Write-Host "OK /categorie (sections + Keuken + header)"

foreach ($slug in @("tuin","keuken","elektronica","mode","wonen","sport","voeding","huishouden")) {
  $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 20 "$web/categorie/$slug"
  if ($code -ne "200") { throw "/categorie/$slug expected 200, got $code" }
}
Write-Host "OK category slugs open (incl. Keuken)"

curl.exe -s --max-time 30 "$web/categorie/tuin" -o "$env:TEMP\em-cat-reg.html"
$cat = Get-Content -Raw "$env:TEMP\em-cat-reg.html"
if ($cat -notmatch ">Tuin<") { throw "category page title missing" }
if ($cat -notmatch 'aria-label="Breadcrumb"') { throw "category breadcrumb missing" }
if ($cat -notmatch "Advertentie") { throw "category ad slot missing" }
if ($cat -notmatch "Binnenkort beschikbaar") { throw "category pending state missing" }
if ($cat -notmatch "Paginering") { throw "category pagination chrome missing" }
if ($cat -match "noindex") { throw "category page must be indexable" }
Write-Host "OK /categorie/tuin (indexable + breadcrumb + ad + pending + pagination)"

$unknown = curl.exe -s -o NUL -w "%{http_code}" --max-time 20 "$web/categorie/onbekend"
if ($unknown -ne "404") { throw "unknown category expected 404, got $unknown" }
Write-Host "OK unknown category 404"

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
