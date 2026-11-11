#Requires -Version 5.1
# Internal launcher used by Start-EuropMade.ps1 (detached child process).
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$RepoRoot,
  [Parameter(Mandatory)][string]$Filter,
  [Parameter(Mandatory)][string]$LogFile,
  [string]$ErrLogFile = ""
)

$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "EuropMade-DevLocal.ps1")
Initialize-EuropMadeDevEnvironment
Set-Location -LiteralPath $RepoRoot

if (-not $ErrLogFile) {
  $ErrLogFile = [System.IO.Path]::ChangeExtension($LogFile, ".err.log")
}

function Write-LaunchLog([string]$Message, [string]$Target) {
  $line = "{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $Message
  Add-Content -LiteralPath $Target -Value $line -Encoding UTF8
}

Write-LaunchLog "starting pnpm --filter $Filter dev (cwd=$RepoRoot)" $LogFile
Write-LaunchLog "stderr/error companion for $Filter" $ErrLogFile

$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpm) { $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue }
if (-not $pnpm) {
  Write-LaunchLog "FATAL: pnpm not found on PATH after env init" $ErrLogFile
  Write-LaunchLog "exited 127" $LogFile
  exit 127
}

Write-LaunchLog "using pnpm=$($pnpm.Source)" $LogFile

# Use PowerShell invocation (not cmd redirects): cmd quoting broke @scope filters (exit 1, empty logs).
# stdout+stderr merged to out log; ErrorRecords / exceptions also copied to err log.
try {
  & $pnpm.Source --filter $Filter dev 2>&1 | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) {
      $text = $_.ToString()
      Add-Content -LiteralPath $LogFile -Value $text -Encoding UTF8
      Add-Content -LiteralPath $ErrLogFile -Value $text -Encoding UTF8
    } else {
      $text = "$_"
      if ($text -ne "") {
        Add-Content -LiteralPath $LogFile -Value $text -Encoding UTF8
      }
    }
  }
  $code = 0
  if ($null -ne $LASTEXITCODE) { $code = $LASTEXITCODE }
} catch {
  Write-LaunchLog "exception: $($_.Exception.Message)" $ErrLogFile
  Write-LaunchLog "exception: $($_.Exception.Message)" $LogFile
  $code = 1
}

Write-LaunchLog "exited $code" $LogFile
if ($code -ne 0) {
  Write-LaunchLog "process exited non-zero: $code" $ErrLogFile
}
exit $code
