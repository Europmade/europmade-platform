#Requires -Version 5.1
<#
.SYNOPSIS
  Start EuropMade local Docker PostgreSQL + backend (:9000) + storefront (:3000) + admin (:3001).

.DESCRIPTION
  Reuses healthy services. Starts detached processes so they keep running after this script exits.
  Logs: <repo>/logs/dev-local/

  -FromScheduledTask: Task Scheduler bootstrap. Spawns a hidden worker and exits 0 immediately
  so the scheduled task is not killed with STATUS_CONTROL_C_EXIT (0xC000013A) while waiting
  for Docker Desktop after logon.
#>
[CmdletBinding()]
param(
  [switch]$Repair,
  [switch]$FromScheduledTask,
  [int]$DockerTimeoutSec = 180,
  [int]$AppTimeoutSec = 420
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "EuropMade-DevLocal.ps1")

$RepoRoot = Get-EuropMadeRepoRoot -StartPath $PSScriptRoot
$LogDir = Get-EuropMadeLogDir -RepoRoot $RepoRoot
Set-Location -LiteralPath $RepoRoot
Initialize-EuropMadeDevEnvironment -LogDir $LogDir

# Task Scheduler tears down Interactive consoles -> 0xC000013A. Hand off to detached worker.
if ($FromScheduledTask) {
  $workerDockerTimeout = [Math]::Max($DockerTimeoutSec, 900)
  $workerAppTimeout = [Math]::Max($AppTimeoutSec, 420)
  Write-EuropMadeLog -LogDir $LogDir -Message "=== Scheduled-task bootstrap: spawning detached worker (DockerTimeout=${workerDockerTimeout}s) ==="
  Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "bootstrap" -ExitCode 0 -Detail "spawning worker"
  $psExe = (Get-Command powershell.exe).Source
  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-WindowStyle", "Hidden",
    "-File", $PSCommandPath,
    "-DockerTimeoutSec", "$workerDockerTimeout",
    "-AppTimeoutSec", "$workerAppTimeout"
  )
  if ($Repair) { $argList += "-Repair" }
  Start-Process -FilePath $psExe -ArgumentList $argList -WorkingDirectory $RepoRoot -WindowStyle Hidden | Out-Null
  Write-EuropMadeLog -LogDir $LogDir -Message "Scheduled-task bootstrap done (worker detached); task can exit 0"
  exit 0
}

try {
  if ([Environment]::UserInteractive -and [Console]::In) {
    [Console]::TreatControlCAsInput = $true
  }
} catch { }
try {
  if ([Environment]::UserInteractive) {
    $null = [Console]::CancelKeyPress.Add({
      param($sender, $eventArgs)
      $eventArgs.Cancel = $true
    })
  }
} catch { }

Write-EuropMadeLog -LogDir $LogDir -Message "=== EuropMade local startup (root=$RepoRoot) ==="
Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "worker-start" -ExitCode 0 -Detail "waiting for docker"

if (-not (Wait-EuropMadeDockerReady -LogDir $LogDir -TimeoutSec $DockerTimeoutSec)) {
  Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "Docker Desktop is not available after ${DockerTimeoutSec}s"
  Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "docker-timeout" -ExitCode 2 -Detail "docker engine not ready"
  exit 2
}

if (-not (Ensure-EuropMadePostgres -RepoRoot $RepoRoot -LogDir $LogDir)) {
  Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "PostgreSQL failed to become healthy"
  Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "postgres-fail" -ExitCode 3 -Detail "postgres not healthy"
  exit 3
}

Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "starting-apps" -ExitCode 0 -Detail "postgres ready"

$apps = @($script:EuropMadeServices | Where-Object { $_.Kind -eq "app" })
$failed = @()
foreach ($svc in $apps) {
  $ok = Ensure-EuropMadeApp -RepoRoot $RepoRoot -LogDir $LogDir -Service $svc -TimeoutSec $AppTimeoutSec -Repair:$Repair
  if (-not $ok) { $failed += $svc.Name }
}

Write-Host ""
Write-Host "Status after startup:"
Get-EuropMadeServiceStatus -RepoRoot $RepoRoot | Format-Table -AutoSize | Out-String | Write-Host

if ($failed.Count -gt 0) {
  $detail = "Failed services: " + ($failed -join ", ")
  Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message ("$detail - see logs in $LogDir")
  Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "apps-fail" -ExitCode 1 -Detail $detail
  exit 1
}

Write-EuropMadeLog -LogDir $LogDir -Message "All EuropMade local hosts healthy."
Write-EuropMadeWorkerStatus -LogDir $LogDir -Phase "healthy" -ExitCode 0 -Detail "all hosts healthy"
exit 0
