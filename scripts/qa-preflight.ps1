$ErrorActionPreference = "Stop"

$requiredVars = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DEALENGINE_QA_API_URL",
  "DEALENGINE_QA_USER_EMAIL",
  "DEALENGINE_QA_USER_PASSWORD",
  "DEALENGINE_QA_READY_DEAL_ID",
  "DEALENGINE_QA_AUTOSAVE_DEAL_ID"
)

$missing = @()
foreach ($name in $requiredVars) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missing += $name
  }
}

if ($missing.Count -gt 0) {
  Write-Host "QA preflight failed: missing required env vars."
  $missing | ForEach-Object { Write-Host " - $_" }
  exit 1
}

# ---- Local Supabase reachability (API gateway) ----
$portCheck = Test-NetConnection -ComputerName "127.0.0.1" -Port 54321
if (-not $portCheck.TcpTestSucceeded) {
  Write-Host "QA preflight failed: 127.0.0.1:54321 is not reachable."
  exit 1
}

$apiUrl = $env:DEALENGINE_QA_API_URL.TrimEnd("/")
$tokenUrl = "$apiUrl/auth/v1/token?grant_type=password"
$anonKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

$payload = @{
  email = $env:DEALENGINE_QA_USER_EMAIL
  password = $env:DEALENGINE_QA_USER_PASSWORD
} | ConvertTo-Json

$headers = @{
  apikey = $anonKey
  Authorization = "Bearer $anonKey"
}

# ---- Auth token check ----
try {
  $response = Invoke-WebRequest -Method Post -Uri $tokenUrl -Headers $headers -Body $payload -ContentType "application/json" -TimeoutSec 20
} catch {
  $statusCode = $null
  $body = $null

  if ($_.Exception.Response) {
    try {
      $statusCode = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
    } catch {
      $body = $_.Exception.Message
    }
  } else {
    $body = $_.Exception.Message
  }

  Write-Host "QA preflight failed: auth token request errored."
  if ($statusCode) { Write-Host "Status: $statusCode" }
  if ($body) { Write-Host "Response: $body" }
  exit 1
}

if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
  Write-Host "QA preflight failed: auth token request returned $($response.StatusCode)."
  if ($response.Content) { Write-Host "Response: $($response.Content)" }
  exit 1
}

try {
  $tokenBody = $response.Content | ConvertFrom-Json
} catch {
  Write-Host "QA preflight failed: auth token response is not valid JSON."
  Write-Host "Response: $($response.Content)"
  exit 1
}

if (-not $tokenBody.access_token) {
  Write-Host "QA preflight failed: auth token response missing access_token."
  Write-Host "Response: $($response.Content)"
  exit 1
}

# ---- Edge Functions sanity check (catches the exact 503 you hit) ----
# NOTE: We intentionally use GET so it should be "safe" (no side effects).
# v1-analyze is POST-only, so a healthy setup often returns 401/405/400 here — that’s OK.
$fnUrl = "$apiUrl/functions/v1/v1-analyze"
$fnHeaders = @{
  apikey = $anonKey
  Authorization = "Bearer $($tokenBody.access_token)"
}

try {
  $fnResp = Invoke-WebRequest -Method Get -Uri $fnUrl -Headers $fnHeaders -TimeoutSec 15
  Write-Host "Edge Functions reachable: GET $fnUrl returned $($fnResp.StatusCode)."
} catch {
  $statusCode = $null
  $body = $null

  if ($_.Exception.Response) {
    try {
      $statusCode = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
    } catch {
      $body = $_.Exception.Message
    }
  } else {
    $body = $_.Exception.Message
  }

  # Pass conditions: function runtime is up and responding (even if method/auth is wrong).
  if ($statusCode -in @(400, 401, 403, 405, 415)) {
    Write-Host "Edge Functions reachable: v1-analyze responded HTTP $statusCode (expected for GET)."
  }
  elseif ($statusCode -eq 404) {
    Write-Host "QA preflight failed: v1-analyze not found at $fnUrl (HTTP 404)."
    if ($body) { Write-Host "Response: $body" }
    exit 1
  }
  else {
    Write-Host "QA preflight failed: Edge Functions check errored."
    if ($statusCode) { Write-Host "Status: $statusCode" }
    if ($body) { Write-Host "Response: $body" }
    exit 1
  }
}

Write-Host "QA preflight OK."
