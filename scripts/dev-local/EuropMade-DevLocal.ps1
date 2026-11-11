# Shared helpers for EuropMade local Windows startup / healthcheck.
# Dot-source from sibling scripts. Does not start services by itself.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EuropMadeRepoRoot {
  param([string]$StartPath = $PSScriptRoot)
  $dir = Resolve-Path -LiteralPath $StartPath
  while ($true) {
    $compose = Join-Path $dir "docker-compose.yml"
    $pkg = Join-Path $dir "package.json"
    if ((Test-Path -LiteralPath $compose) -and (Test-Path -LiteralPath $pkg)) {
      return [string]$dir
    }
    $parent = Split-Path -Parent $dir
    if (-not $parent -or $parent -eq $dir) {
      throw "EuropMade repository root not found (docker-compose.yml + package.json) from $StartPath"
    }
    $dir = $parent
  }
}

function Get-EuropMadeLogDir {
  param([Parameter(Mandatory)][string]$RepoRoot)
  $dir = Join-Path $RepoRoot "logs\dev-local"
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  return $dir
}

function Write-EuropMadeLog {
  param(
    [Parameter(Mandatory)][string]$LogDir,
    [Parameter(Mandatory)][string]$Message,
    [ValidateSet("INFO", "WARN", "ERROR")][string]$Level = "INFO"
  )
  $line = "{0:yyyy-MM-dd HH:mm:ss} [{1}] {2}" -f (Get-Date), $Level, $Message
  $file = Join-Path $LogDir ("startup-{0:yyyyMMdd}.log" -f (Get-Date))
  Add-Content -LiteralPath $file -Value $line -Encoding UTF8
  switch ($Level) {
    "ERROR" { Write-Host $line -ForegroundColor Red }
    "WARN" { Write-Host $line -ForegroundColor Yellow }
    default { Write-Host $line }
  }
}

function Write-EuropMadeWorkerStatus {
  param(
    [Parameter(Mandatory)][string]$LogDir,
    [Parameter(Mandatory)][string]$Phase,
    [int]$ExitCode = 0,
    [string]$Detail = ""
  )
  $obj = [pscustomobject]@{
    updatedAt = (Get-Date).ToString("o")
    phase = $Phase
    exitCode = $ExitCode
    detail = $Detail
    processId = $PID
  }
  $path = Join-Path $LogDir "worker-status.json"
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $path -Encoding UTF8
}

function Get-EuropMadeDockerInstallRoots {
  $roots = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop"),
    (Join-Path $env:ProgramFiles "Docker\Docker"),
    (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker")
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  return @($roots)
}

function Get-EuropMadeDockerDesktopExe {
  foreach ($root in (Get-EuropMadeDockerInstallRoots)) {
    foreach ($rel in @(
      "Docker Desktop.exe",
      "frontend\Docker Desktop.exe"
    )) {
      $p = Join-Path $root $rel
      if (Test-Path -LiteralPath $p) { return $p }
    }
  }
  return $null
}

function Get-EuropMadeDockerCli {
  $cmd = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($root in (Get-EuropMadeDockerInstallRoots)) {
    $p = Join-Path $root "resources\bin\docker.exe"
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Initialize-EuropMadeDevEnvironment {
  param([string]$LogDir)

  # Task Scheduler often starts with an incomplete PATH. Rebuild from registry + known tools.
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $parts = @()
  foreach ($chunk in @($machine, $user, $env:Path)) {
    if (-not $chunk) { continue }
    foreach ($p in ($chunk -split ';')) {
      if ($p -and ($parts -notcontains $p)) { $parts += $p }
    }
  }

  $extra = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin"),
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"),
    (Join-Path $env:ProgramFiles "nodejs"),
    (Join-Path $env:APPDATA "npm"),
    (Join-Path $env:LOCALAPPDATA "pnpm")
  )
  foreach ($p in $extra) {
    if ($p -and (Test-Path -LiteralPath $p) -and ($parts -notcontains $p)) {
      $parts = @($p) + $parts
    }
  }
  $env:Path = ($parts -join ';')

  if ($LogDir) {
    $dockerCli = Get-EuropMadeDockerCli
    $desktop = Get-EuropMadeDockerDesktopExe
    $pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
    if (-not $pnpm) { $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue }
    Write-EuropMadeLog -LogDir $LogDir -Message (
      "Env ready: dockerCli=$(if ($dockerCli) { $dockerCli } else { 'MISSING' }); desktop=$(if ($desktop) { $desktop } else { 'MISSING' }); pnpm=$(if ($pnpm) { $pnpm.Source } else { 'MISSING' })"
    )
  }
}

$script:EuropMadeServices = @(
  [pscustomobject]@{
    Name = "postgres"
    Kind = "docker"
    Container = "europmade-postgres"
    Port = 5432
    Url = $null
  }
  [pscustomobject]@{
    Name = "backend"
    Kind = "app"
    Filter = "@europmade/backend"
    Port = 9000
    Url = "http://127.0.0.1:9000/health"
    CmdMatch = @("medusa", "@europmade/backend", "apps\\backend", "apps/backend")
  }
  [pscustomobject]@{
    Name = "web"
    Kind = "app"
    Filter = "@europmade/web"
    Port = 3000
    # /login is lighter than full homepage SSR for readiness checks.
    Url = "http://127.0.0.1:3000/login"
    CmdMatch = @("next", "@europmade/web", "apps\\web", "apps/web")
  }
  [pscustomobject]@{
    Name = "admin"
    Kind = "app"
    Filter = "@europmade/admin"
    Port = 3001
    Url = "http://127.0.0.1:3001/login"
    CmdMatch = @("next", "@europmade/admin", "apps\\admin", "apps/admin")
  }
)

function Test-EuropMadeHttpOk {
  param(
    [Parameter(Mandatory)][string]$Url,
    # Next.js storefront SSR often needs >5s on first/cold requests.
    [int]$TimeoutSec = 30
  )
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)
  } catch {
    return $false
  }
}

function Wait-EuropMadeHttpOk {
  param(
    [Parameter(Mandatory)][string]$Url,
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$LogDir,
    [int]$TimeoutSec = 180,
    [int]$PollSec = 5
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  # Per-request timeout must exceed typical SSR time (~3-8s), not just poll interval.
  $requestTimeout = 30
  while ((Get-Date) -lt $deadline) {
    if (Test-EuropMadeHttpOk -Url $Url -TimeoutSec $requestTimeout) {
      Write-EuropMadeLog -LogDir $LogDir -Message "$Name healthy: $Url"
      return $true
    }
    Start-Sleep -Seconds $PollSec
  }
  Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "$Name not healthy after ${TimeoutSec}s: $Url"
  return $false
}

function Test-EuropMadeDockerReady {
  $dockerCli = Get-EuropMadeDockerCli
  if (-not $dockerCli) { return $false }
  try {
    & $dockerCli info 1>$null 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Start-EuropMadeDockerDesktopIfNeeded {
  param([Parameter(Mandatory)][string]$LogDir)
  if (Test-EuropMadeDockerReady) { return $true }

  $exe = Get-EuropMadeDockerDesktopExe
  if (-not $exe) {
    Write-EuropMadeLog -LogDir $LogDir -Level WARN -Message "Docker Desktop.exe not found under LocalAppData\\Programs\\DockerDesktop or Program Files; waiting for engine only"
    return $false
  }

  $already = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
  if (-not $already) {
    Write-EuropMadeLog -LogDir $LogDir -Message "Starting Docker Desktop: $exe"
    try {
      Start-Process -FilePath $exe | Out-Null
    } catch {
      Write-EuropMadeLog -LogDir $LogDir -Level WARN -Message "Could not start Docker Desktop: $($_.Exception.Message)"
      return $false
    }
  } else {
    Write-EuropMadeLog -LogDir $LogDir -Message "Docker Desktop process present; waiting for engine ($exe)"
  }
  return $true
}

function Wait-EuropMadeDockerReady {
  param(
    [Parameter(Mandatory)][string]$LogDir,
    [int]$TimeoutSec = 180,
    [int]$PollSec = 5
  )
  Start-EuropMadeDockerDesktopIfNeeded -LogDir $LogDir | Out-Null
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $attempt = 0
  while ((Get-Date) -lt $deadline) {
    if (Test-EuropMadeDockerReady) {
      Write-EuropMadeLog -LogDir $LogDir -Message "Docker engine ready"
      return $true
    }
    $attempt++
    if (($attempt % 3) -eq 1) {
      Start-EuropMadeDockerDesktopIfNeeded -LogDir $LogDir | Out-Null
    }
    $left = [int][Math]::Max(0, ($deadline - (Get-Date)).TotalSeconds)
    Write-EuropMadeLog -LogDir $LogDir -Level WARN -Message "Waiting for Docker Desktop... (${left}s left)"
    Start-Sleep -Seconds $PollSec
  }
  Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "Docker engine not ready after ${TimeoutSec}s"
  return $false
}

function Get-EuropMadePostgresHealth {
  $dockerCli = Get-EuropMadeDockerCli
  if (-not $dockerCli) { return "missing" }
  try {
    $status = (& $dockerCli inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" europmade-postgres 2>$null)
    if (-not $status) { return "missing" }
    return ($status.Trim())
  } catch {
    return "missing"
  }
}

function Ensure-EuropMadePostgres {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$LogDir,
    [int]$TimeoutSec = 120
  )
  $dockerCli = Get-EuropMadeDockerCli
  if (-not $dockerCli) {
    Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "docker CLI not found after env init"
    return $false
  }
  Push-Location $RepoRoot
  try {
    $health = Get-EuropMadePostgresHealth
    if ($health -ne "healthy") {
      Write-EuropMadeLog -LogDir $LogDir -Message "Starting PostgreSQL via docker compose (status=$health)"
      & $dockerCli compose up -d
      if ($LASTEXITCODE -ne 0) {
        throw "docker compose up -d failed with exit $LASTEXITCODE"
      }
    } else {
      Write-EuropMadeLog -LogDir $LogDir -Message "PostgreSQL container already healthy"
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
      $health = Get-EuropMadePostgresHealth
      if ($health -eq "healthy") {
        $ready = & $dockerCli exec europmade-postgres pg_isready -U europmade 2>&1
        if ($LASTEXITCODE -eq 0) {
          Write-EuropMadeLog -LogDir $LogDir -Message "PostgreSQL ready ($ready)"
          return $true
        }
      }
      Start-Sleep -Seconds 3
    }
    Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "PostgreSQL not healthy after ${TimeoutSec}s (status=$(Get-EuropMadePostgresHealth))"
    return $false
  } finally {
    Pop-Location
  }
}

function Get-EuropMadePortOwner {
  param([Parameter(Mandatory)][int]$Port)
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-CimInstance Win32_Process -Filter ("ProcessId={0}" -f $conn.OwningProcess) -ErrorAction SilentlyContinue
    if (-not $proc) {
      return [pscustomobject]@{ Pid = $conn.OwningProcess; CommandLine = $null; IsEuropMade = $false }
    }
    $cmd = [string]$proc.CommandLine
    $rootHint = "EuropMade"
    $isOurs = ($cmd -match [regex]::Escape($rootHint)) -or ($cmd -match "europmade")
    return [pscustomobject]@{
      Pid = [int]$proc.ProcessId
      CommandLine = $cmd
      IsEuropMade = [bool]$isOurs
    }
  } catch {
    return $null
  }
}

function Test-EuropMadeAppHealthy {
  param([Parameter(Mandatory)]$Service)
  if (-not $Service.Url) { return $false }
  return (Test-EuropMadeHttpOk -Url $Service.Url)
}

function Stop-EuropMadeStuckApp {
  param(
    [Parameter(Mandatory)]$Service,
    [Parameter(Mandatory)][string]$LogDir,
    [switch]$Force
  )
  $owner = Get-EuropMadePortOwner -Port $Service.Port
  if (-not $owner) {
    Write-EuropMadeLog -LogDir $LogDir -Message "$($Service.Name): port $($Service.Port) free"
    return $true
  }
  if (-not $owner.IsEuropMade -and -not $Force) {
    $cmdPreview = ""
    if ($owner.CommandLine) {
      $cmdPreview = $owner.CommandLine.Substring(0, [Math]::Min(160, $owner.CommandLine.Length))
    }
    Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message (
      "$($Service.Name): port $($Service.Port) owned by non-EuropMade PID $($owner.Pid); refusing to kill. CommandLine truncated: $cmdPreview"
    )
    return $false
  }
  Write-EuropMadeLog -LogDir $LogDir -Level WARN -Message "$($Service.Name): stopping stuck EuropMade PID $($owner.Pid) on port $($Service.Port)"
  try {
    Stop-Process -Id $owner.Pid -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    return $true
  } catch {
    Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "$($Service.Name): failed to stop PID $($owner.Pid): $($_.Exception.Message)"
    return $false
  }
}

function Start-EuropMadeAppDetached {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$LogDir,
    [Parameter(Mandatory)]$Service
  )
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $outLog = Join-Path $LogDir "$($Service.Name)-$stamp.out.log"
  $errLog = Join-Path $LogDir "$($Service.Name)-$stamp.err.log"
  $pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if (-not $pnpm) { $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue }
  if (-not $pnpm) { throw "pnpm not found on PATH after Initialize-EuropMadeDevEnvironment" }

  # pnpm is a .cmd shim: Start-Process redirect fails on batch files.
  # Launch via a dedicated -File script so the process tree survives when the starter exits.
  $launcher = Join-Path $PSScriptRoot "Launch-EuropMadeApp.ps1"
  if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Missing launcher script: $launcher"
  }
  Set-Content -LiteralPath $outLog -Value ("{0:yyyy-MM-dd HH:mm:ss} launcher queued" -f (Get-Date)) -Encoding UTF8
  Set-Content -LiteralPath $errLog -Value ("{0:yyyy-MM-dd HH:mm:ss} stderr log" -f (Get-Date)) -Encoding UTF8

  Write-EuropMadeLog -LogDir $LogDir -Message "Starting $($Service.Name): pnpm --filter $($Service.Filter) dev (out=$outLog err=$errLog)"

  $psExe = (Get-Command powershell.exe).Source
  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $launcher,
    "-RepoRoot", $RepoRoot,
    "-Filter", $Service.Filter,
    "-LogFile", $outLog,
    "-ErrLogFile", $errLog
  )
  $proc = Start-Process -FilePath $psExe `
    -ArgumentList $argList `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -PassThru

  $statePath = Join-Path $LogDir "pids.json"
  $stateObj = [ordered]@{}
  if (Test-Path -LiteralPath $statePath) {
    try {
      $existing = Get-Content -LiteralPath $statePath -Raw -ErrorAction Stop | ConvertFrom-Json
      foreach ($p in $existing.PSObject.Properties) {
        $stateObj[$p.Name] = $p.Value
      }
    } catch {
      $stateObj = [ordered]@{}
    }
  }
  $stateObj[$Service.Name] = [pscustomobject]@{
    pid = $proc.Id
    startedAt = (Get-Date).ToString("o")
    outLog = $outLog
    errLog = $errLog
    filter = $Service.Filter
    port = $Service.Port
  }
  ($stateObj | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $statePath -Encoding UTF8
  return $proc.Id
}

function Ensure-EuropMadeApp {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$LogDir,
    [Parameter(Mandatory)]$Service,
    [int]$TimeoutSec = 240,
    [switch]$Repair
  )
  if (Test-EuropMadeAppHealthy -Service $Service) {
    Write-EuropMadeLog -LogDir $LogDir -Message "$($Service.Name) already healthy ($($Service.Url))"
    return $true
  }

  $owner = Get-EuropMadePortOwner -Port $Service.Port
  if ($owner) {
    Write-EuropMadeLog -LogDir $LogDir -Level WARN -Message (
      "$($Service.Name): port $($Service.Port) in use (PID $($owner.Pid)) but HTTP unhealthy"
    )
    if ($Repair -or $owner.IsEuropMade) {
      if (-not (Stop-EuropMadeStuckApp -Service $Service -LogDir $LogDir)) {
        return $false
      }
    } else {
      return $false
    }
  }

  Start-EuropMadeAppDetached -RepoRoot $RepoRoot -LogDir $LogDir -Service $Service | Out-Null
  return (Wait-EuropMadeHttpOk -Url $Service.Url -Name $Service.Name -LogDir $LogDir -TimeoutSec $TimeoutSec)
}

function Get-EuropMadeServiceStatus {
  param([Parameter(Mandatory)][string]$RepoRoot)
  $rows = @()
  foreach ($svc in $script:EuropMadeServices) {
    if ($svc.Kind -eq "docker") {
      $health = Get-EuropMadePostgresHealth
      $httpOk = $false
      $ready = $false
      if ($health -eq "healthy") {
        $dockerCli = Get-EuropMadeDockerCli
        if ($dockerCli) {
          & $dockerCli exec europmade-postgres pg_isready -U europmade 1>$null 2>$null
          $ready = ($LASTEXITCODE -eq 0)
        }
      }
      $rows += [pscustomobject]@{
        Name = $svc.Name
        Port = $svc.Port
        Url = "(docker health + pg_isready)"
        Status = if ($ready) { "PASS" } elseif ($health -eq "missing") { "DOWN" } else { "FAIL" }
        Detail = "container=$health; pg_isready=$ready"
      }
      continue
    }
    $ok = Test-EuropMadeAppHealthy -Service $svc
    $owner = Get-EuropMadePortOwner -Port $svc.Port
    $detail = if ($ok) { "HTTP 2xx" } elseif ($owner) { "port owned by PID $($owner.Pid); HTTP fail" } else { "not listening / HTTP fail" }
    $rows += [pscustomobject]@{
      Name = $svc.Name
      Port = $svc.Port
      Url = $svc.Url
      Status = if ($ok) { "PASS" } else { "FAIL" }
      Detail = $detail
    }
  }
  return $rows
}
