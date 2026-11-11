#Requires -Version 5.1
<#
.SYNOPSIS
  Show or install a Windows Task Scheduler job that starts EuropMade after logon.

.DESCRIPTION
  Default mode is DRY-RUN: prints the proposed task and exits without changes.
  Pass -Install only after reviewing the configuration (and after explicit user consent).

  The task uses -FromScheduledTask so the long Docker/app wait runs in a detached
  worker. That avoids LastTaskResult 0xC000013A (STATUS_CONTROL_C_EXIT) when Task
  Scheduler tears down the interactive console shortly after logon.

  The worker refreshes PATH from the registry and locates Docker Desktop under
  %LOCALAPPDATA%\Programs\DockerDesktop (user install), not only Program Files.
#>
[CmdletBinding()]
param(
  [switch]$Install,
  [string]$TaskName = "EuropMade Local Dev Startup",
  # Docker Desktop after reboot often needs more than 2 minutes.
  [int]$DelayMinutes = 5
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "EuropMade-DevLocal.ps1")

$RepoRoot = Get-EuropMadeRepoRoot -StartPath $PSScriptRoot
$StartScript = Join-Path $PSScriptRoot "Start-EuropMade.ps1"
$LogDir = Get-EuropMadeLogDir -RepoRoot $RepoRoot

$psExe = (Get-Command powershell.exe).Source
# Hidden + FromScheduledTask: bootstrap exits quickly; worker continues detached.
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$StartScript`" -FromScheduledTask"

Write-Host "=== Proposed Task Scheduler configuration ==="
Write-Host "Task name     : $TaskName"
Write-Host "User          : $env:USERDOMAIN\$env:USERNAME (current user, interactive logon)"
Write-Host "Trigger       : At log on, delay ${DelayMinutes} minute(s) (Docker Desktop warmup)"
Write-Host "Action        : $psExe $arguments"
Write-Host "Working dir   : $RepoRoot"
Write-Host "Run level     : Least privilege (no admin elevation)"
Write-Host "Multiple runs : Ignore new (prevents duplicate starts)"
Write-Host "Bootstrap     : -FromScheduledTask (detached worker; avoids 0xC000013A)"
Write-Host "Logs          : $LogDir"
Write-Host ""

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Existing task found (state=$($existing.State)). -Install will replace it."
} else {
  Write-Host "No existing task with this name."
}

if (-not $Install) {
  Write-Host ""
  Write-Host "DRY-RUN only. No task was created."
  Write-Host "To install after explicit consent, re-run with -Install."
  exit 0
}

$action = New-ScheduledTaskAction -Execute $psExe -Argument $arguments -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT{0}M" -f $DelayMinutes
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Starts EuropMade Docker PostgreSQL + local Medusa/Next.js apps after user logon (detached worker)." `
  -Force | Out-Null

Write-Host "Installed task '$TaskName'."
Write-Host "Verify: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove:  .\scripts\dev-local\Uninstall-EuropMadeStartupTask.ps1"
exit 0
