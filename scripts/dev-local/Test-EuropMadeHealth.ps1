#Requires -Version 5.1
<#
.SYNOPSIS
  Show HTTP/Docker health for EuropMade local hosts. Optionally repair unhealthy apps.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Test-EuropMadeHealth.ps1

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Test-EuropMadeHealth.ps1 -Repair
#>
[CmdletBinding()]
param(
  [switch]$Repair,
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "EuropMade-DevLocal.ps1")

$RepoRoot = Get-EuropMadeRepoRoot -StartPath $PSScriptRoot
$LogDir = Get-EuropMadeLogDir -RepoRoot $RepoRoot
Set-Location -LiteralPath $RepoRoot

if (-not $Quiet) {
  Write-Host "EuropMade health - $RepoRoot"
  Write-Host ("Docker ready: " + (Test-EuropMadeDockerReady))
}

$rows = Get-EuropMadeServiceStatus -RepoRoot $RepoRoot
if (-not $Quiet) {
  $rows | Format-Table -AutoSize
}

$failedRows = @($rows | Where-Object { $_.Status -ne "PASS" })
$allPass = ($failedRows.Count -eq 0)

if ($Repair -and -not $allPass) {
  Write-EuropMadeLog -LogDir $LogDir -Message "Repair requested for unhealthy services"
  if (-not (Test-EuropMadeDockerReady)) {
    if (-not (Wait-EuropMadeDockerReady -LogDir $LogDir -TimeoutSec 180)) {
      Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "Cannot repair: Docker unavailable"
      exit 2
    }
  }
  $pg = $rows | Where-Object { $_.Name -eq "postgres" } | Select-Object -First 1
  if ($pg -and $pg.Status -ne "PASS") {
    if (-not (Ensure-EuropMadePostgres -RepoRoot $RepoRoot -LogDir $LogDir)) {
      exit 2
    }
  }
  foreach ($svc in ($script:EuropMadeServices | Where-Object { $_.Kind -eq "app" })) {
    $row = $rows | Where-Object { $_.Name -eq $svc.Name } | Select-Object -First 1
    if ($row -and $row.Status -ne "PASS") {
      $ok = Ensure-EuropMadeApp -RepoRoot $RepoRoot -LogDir $LogDir -Service $svc -Repair
      if (-not $ok) {
        Write-EuropMadeLog -LogDir $LogDir -Level ERROR -Message "Repair failed for $($svc.Name)"
      }
    }
  }
  $rows = Get-EuropMadeServiceStatus -RepoRoot $RepoRoot
  if (-not $Quiet) {
    Write-Host "Status after repair:"
    $rows | Format-Table -AutoSize
  }
  $failedRows = @($rows | Where-Object { $_.Status -ne "PASS" })
  $allPass = ($failedRows.Count -eq 0)
}

if (-not $Quiet) {
  Write-Host "Login auth: not checked by this script (HTTP page OK is not proof of authentication)."
  Write-Host "Logs: $LogDir"
}

if ($allPass) { exit 0 } else { exit 1 }
