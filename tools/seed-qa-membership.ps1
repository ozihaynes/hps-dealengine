Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Local Supabase API (dev stack)
$SUPABASE_URL = "http://127.0.0.1:54321"

if (-not $SUPABASE_URL) {
    throw "SUPABASE_URL is empty. Set it before running."
}

Write-Host "`nUsing SUPABASE_URL = $SUPABASE_URL" -ForegroundColor Cyan

# --------------------------------------------
# 1) Prompt for SUPABASE_SERVICE_ROLE_KEY
# --------------------------------------------
if (-not (Get-Variable SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue)) {
    $secSrv = Read-Host -AsSecureString "Enter SUPABASE_SERVICE_ROLE_KEY (service_role key for this project)"
    $SUPABASE_SERVICE_ROLE_KEY = [System.Net.NetworkCredential]::new("", $secSrv).Password
}

if (-not $SUPABASE_SERVICE_ROLE_KEY) {
    throw "SUPABASE_SERVICE_ROLE_KEY is empty; cannot continue."
}

# Headers for service_role REST call (admin/seed only)
$headers = @{
    "apikey"        = $SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# --------------------------------------------
# 2) Membership row to insert
# --------------------------------------------
# Seed org + user from your env doc
$bodyObj = @(
    @{
        org_id  = "6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2"
        user_id = "60c126df-350e-4d7e-8ac5-72e37b8bcdb5"
        role    = "vp"
    }
)

$bodyJson = $bodyObj | ConvertTo-Json

$membershipsUrl = "$SUPABASE_URL/rest/v1/memberships"

Write-Host "`nPOST -> $membershipsUrl" -ForegroundColor Cyan
Write-Host "Body:" -ForegroundColor DarkGray
Write-Host $bodyJson -ForegroundColor DarkGray

try {
    $resp = Invoke-RestMethod -Uri $membershipsUrl -Method Post -Headers $headers -Body $bodyJson
    Write-Host "`nInsert response:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "`nInsert failed:" -ForegroundColor Red
    $_ | Format-List * -Force
}
