Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --------------------------------
# 0) Core config (local Supabase)
# --------------------------------
$SUPABASE_URL = "http://127.0.0.1:54321"

if (-not $SUPABASE_URL) {
    throw "SUPABASE_URL is empty. Set it before running."
}

Write-Host "`nUsing SUPABASE_URL = $SUPABASE_URL" -ForegroundColor Cyan

# ----------------------------------------------------
# 1) Prompt for anon key + test user credentials
# ----------------------------------------------------
if (-not (Get-Variable SUPABASE_ANON_KEY -ErrorAction SilentlyContinue)) {
    $secAnon = Read-Host -AsSecureString "Enter SUPABASE_ANON_KEY (anon public key)"
    $SUPABASE_ANON_KEY = [System.Net.NetworkCredential]::new("", $secAnon).Password
}

if (-not (Get-Variable TEST_EMAIL -ErrorAction SilentlyContinue)) {
    $TEST_EMAIL = Read-Host "Enter test user email (e.g. dev+local@example.com)"
}

if (-not (Get-Variable TEST_PASSWORD -ErrorAction SilentlyContinue)) {
    $secPwd = Read-Host -AsSecureString "Enter password for $TEST_EMAIL"
    $TEST_PASSWORD = [System.Net.NetworkCredential]::new("", $secPwd).Password
}

Write-Host "`nAuth target:" -ForegroundColor Cyan
Write-Host "  Email   : $TEST_EMAIL"
Write-Host "  API URL : $SUPABASE_URL" -ForegroundColor DarkGray

# -------------------------------
# 2) GoTrue sign-in / sign-up
# -------------------------------
$authUrl = "$SUPABASE_URL/auth/v1"

# Base headers for GoTrue
$authHeaders = @{
    "apikey" = $SUPABASE_ANON_KEY
}

# JSON body with email/password
$bodyObj = @{
    email    = $TEST_EMAIL
    password = $TEST_PASSWORD
}
$bodyJson = $bodyObj | ConvertTo-Json

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][hashtable]$Headers,
        [Parameter(Mandatory = $true)][string]$Body
    )

    return Invoke-WebRequest -Uri $Url -Method Post -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
}

Write-Host "`nAttempting sign-in..." -ForegroundColor Cyan

$signInUrl = "$authUrl/token?grant_type=password"
$accessToken = $null

try {
    $signInResp = Invoke-JsonPost -Url $signInUrl -Headers $authHeaders -Body $bodyJson
    $signInJson = $signInResp.Content | ConvertFrom-Json
    $accessToken = $signInJson.access_token
    if (-not $accessToken) {
        throw "Sign-in response did not include access_token."
    }
    Write-Host "Sign-in succeeded." -ForegroundColor Green
}
catch {
    Write-Host "Sign-in failed, attempting sign-up..." -ForegroundColor Yellow

    $signUpUrl = "$authUrl/signup"
    $signUpResp = Invoke-JsonPost -Url $signUpUrl -Headers $authHeaders -Body $bodyJson
    $signUpJson = $signUpResp.Content | ConvertFrom-Json

    $accessToken = $signUpJson.access_token
    if (-not $accessToken) {
        throw "Sign-up response did not include access_token (email confirmation may be required)."
    }

    Write-Host "Sign-up succeeded and access_token received." -ForegroundColor Green
}

# --------------------------
# 3) Build the H header bag
# --------------------------
if (-not $accessToken) {
    throw "No accessToken available; cannot build Authorization header."
}

$global:H = @{
    "apikey"        = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $accessToken"
}

Write-Host "`nJWT header bag built as `$H:" -ForegroundColor Cyan
$H.GetEnumerator() | ForEach-Object {
    if ($_.Key -eq "Authorization") {
        Write-Host ("  {0} = Bearer ***" -f $_.Key)
    }
    else {
        Write-Host ("  {0} = {1}" -f $_.Key, $_.Value)
    }
}

# ----------------------------------
# 4) Sanity: v1-ping with JWT
# ----------------------------------
$API = $SUPABASE_URL
$fnPing = "$API/functions/v1/v1-ping"

Write-Host "`nPinging v1-ping at $fnPing ..." -ForegroundColor Cyan

try {
    $pingResp = Invoke-RestMethod -Uri $fnPing -Method Post -Headers $H -Body '{}' -ContentType 'application/json'
    Write-Host "v1-ping HTTP: 200" -ForegroundColor Green
    $pingResp | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "v1-ping failed:" -ForegroundColor Red
    $_ | Format-List * -Force
}

# ---------------------------------------------
# 5) Real test: v1-policy-get (JWT-protected)
# ---------------------------------------------
Write-Host "`nCalling v1-policy-get (posture = default)..." -ForegroundColor Cyan

$fnPolicyGet = "$API/functions/v1/v1-policy-get"
$policyBody = @{
    posture = "default"
} | ConvertTo-Json

try {
    $policyResp = Invoke-RestMethod -Uri $fnPolicyGet -Method Post -Headers $H -Body $policyBody -ContentType "application/json"
    Write-Host "v1-policy-get HTTP: 200" -ForegroundColor Green
    $policyResp | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "v1-policy-get failed:" -ForegroundColor Red
    $_ | Format-List * -Force
}
