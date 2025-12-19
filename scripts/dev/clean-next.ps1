# Clean Next.js build artifacts (Windows-friendly).
param()

Write-Host "Stopping any running node processes (best effort)..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$nextPath = Join-Path $PSScriptRoot "..\\..\\apps\\hps-dealengine\\.next" | Resolve-Path -ErrorAction SilentlyContinue

if (-not $nextPath) {
  Write-Host ".next not found; nothing to clean."
  return
}

Write-Host "Removing $nextPath ..."
try {
  Remove-Item -Recurse -Force -LiteralPath $nextPath
  Write-Host "Removed .next directory."
} catch {
  Write-Warning "Failed to remove .next: $($_.Exception.Message)"
}
