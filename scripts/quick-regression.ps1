# This script runs a quick regression test on the double-close helpers.
# It will start the Next.js dev server if it's not already running.

$PORT = 3000

$up = Test-NetConnection -ComputerName 'localhost' -Port $PORT -InformationLevel Quiet

if (-not $up) {
    Write-Host "Starting Next dev server..." -ForegroundColor Yellow
    $appPath = Join-Path $PWD "apps\dealengine"
    
    # Start the dev server in a new window
    Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$appPath'; pnpm dev" | Out-Null
    
    # Wait for the server to come online (max 60s)
    Write-Host "Waiting for server on port $PORT..."
    1..120 | ForEach-Object { 
        if (Test-NetConnection -ComputerName 'localhost' -Port $PORT -InformationLevel Quiet) { 
            Write-Host "✅ Server is up." -ForegroundColor Green
            break 
        }
        Start-Sleep -Milliseconds 500 
    }
} else {
    Write-Host "✅ Server already running on port $PORT." -ForegroundColor Green
}

# Source the helper functions
. .\dc-helpers.ps1

Write-Host "`nRunning Show-DC examples..."
Show-DC -ab_price 100000 -bc_price 120000 -county "MIAMI-DADE" -property_type "SFR"   | ft -AutoSize
Show-DC -ab_price 100000 -bc_price 120000 -county "MIAMI-DADE" -property_type "OTHER" | ft -AutoSize

Write-Host "`nRunning Assert-DC test..."
Assert-DC -ab_price 100000 -bc_price 120000 -county OTHER -property_type SFR -hold_days 3 -monthly_carry 300 -expect_spread 17160 -expect_total_costs 2810
