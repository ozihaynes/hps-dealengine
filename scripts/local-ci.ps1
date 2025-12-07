$ErrorActionPreference = "Stop"

# Resolve repo root relative to this script so it works from any calling directory.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$steps = @(
  @{ Name = "pnpm -w typecheck"; Command = { pnpm -w typecheck } },
  @{ Name = "pnpm -w test"; Command = { pnpm -w test } },
  @{ Name = "pnpm -w build"; Command = { pnpm -w build } }
)

foreach ($step in $steps) {
  Write-Host "=== Running: $($step.Name) ===" -ForegroundColor Cyan
  & $step.Command
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Step failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

if ($env:PLAYWRIGHT_ENABLE -eq "true" -or $env:PLAYWRIGHT_ENABLE -eq "1") {
  Write-Host "=== Running: pnpm playwright test ===" -ForegroundColor Cyan
  pnpm playwright test
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Playwright failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
  }
} else {
  Write-Host "Skipping Playwright tests (set PLAYWRIGHT_ENABLE=1 to enable)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Local CI succeeded (typecheck, test, build" `
  + ($(if ($env:PLAYWRIGHT_ENABLE -eq "true" -or $env:PLAYWRIGHT_ENABLE -eq "1") { ", playwright" } else { "" })) `
  + ")." -ForegroundColor Green
