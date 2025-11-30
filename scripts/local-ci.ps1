$ErrorActionPreference = "Stop"

# 1) Go to repo root
Set-Location "C:\Users\oziha\Documents\hps-dealengine"

Write-Host "=== Step 1: Typecheck all workspaces ===" -ForegroundColor Cyan
pnpm -w typecheck

Write-Host "=== Step 2: Run tests for all workspaces ===" -ForegroundColor Cyan
pnpm -w test

Write-Host "=== Step 3: Build Next.js app (apps/hps-dealengine) ===" -ForegroundColor Cyan
Set-Location "apps\hps-dealengine"
pnpm build

Write-Host ""
Write-Host "✅ Local CI: typecheck + tests + Next build all passed." -ForegroundColor Green
