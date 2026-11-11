#Requires -Version 5.1
<#
.SYNOPSIS
  Remove the EuropMade local startup scheduled task (if present).
#>
[CmdletBinding()]
param(
  [string]$TaskName = "EuropMade Local Dev Startup",
  [switch]$ConfirmRemove
)

$ErrorActionPreference = "Stop"
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "Task '$TaskName' not found."
  exit 0
}

if (-not $ConfirmRemove) {
  Write-Host "Will remove task '$TaskName' (state=$($existing.State))."
  Write-Host "Re-run with -ConfirmRemove to delete it."
  exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed task '$TaskName'."
exit 0
