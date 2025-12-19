param()

$ErrorActionPreference = "Stop"

function Coalesce($value, $fallback) {
  if ($null -ne $value) { return $value }
  return $fallback
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..") | Select-Object -ExpandProperty Path

function Read-EnvFile([string]$Path) {
  $dict = @{}
  if (-not (Test-Path $Path)) { return $dict }
  foreach ($line in (Get-Content $Path)) {
    if (-not $line) { continue }
    $trim = $line.Trim()
    if ($trim -eq "" -or $trim.StartsWith("#")) { continue }
    $eq = $trim.IndexOf("=")
    if ($eq -lt 1) { continue }
    $k = $trim.Substring(0, $eq).Trim()
    $v = $trim.Substring($eq + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
    $dict[$k] = $v
  }
  return $dict
}

$envPaths = @(
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.development.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env"),
  (Join-Path -Path $RepoRoot -ChildPath ".env.local"),
  (Join-Path -Path $RepoRoot -ChildPath ".env")
)

function Find-NextPublicAnonKey {
  if ($env:NEXT_PUBLIC_SUPABASE_ANON_KEY) { return $env:NEXT_PUBLIC_SUPABASE_ANON_KEY.Trim() }
  foreach ($p in $envPaths) {
    if (-not (Test-Path $p)) { continue }
    $lines = Get-Content $p
    foreach ($line in $lines) {
      if ($line -match '^\s*NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)$') {
        $v = $Matches[1].Trim()
        if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
        return $v
      }
    }
  }
  return $null
}

function Acquire-CallerJwtFromPassword([string]$SupabaseUrl) {
  $email = $env:HPS_SMOKE_EMAIL
  $pwd = $env:HPS_SMOKE_PASSWORD
  if (-not $email -or -not $pwd) { return $null }
  $anonKey = Find-NextPublicAnonKey
  if (-not $anonKey) {
    Write-Host "FAIL: Cannot find NEXT_PUBLIC_SUPABASE_ANON_KEY for password grant." -ForegroundColor Red
    return $null
  }
  $body = @{ email = $email; password = $pwd } | ConvertTo-Json -Depth 3
  $headers = @{
    apikey = $anonKey
    "Content-Type" = "application/json"
    Accept = "application/json"
  }
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
    $parsed = $resp.Content | ConvertFrom-Json
    if ($parsed.access_token) {
      return $parsed.access_token
    }
  } catch {
    Write-Host "FAIL: Password grant failed when attempting to acquire caller JWT." -ForegroundColor Red
    Write-Host $_
  }
  return $null
}

$SUPABASE_URL = "https://zjkihnihhqmnhpxkecpy.supabase.co"

$candidates = @()
if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }

foreach ($c in $candidates) {
  if ($c -and $c.Trim() -ne "") {
    if ($c -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
      Write-Host "FAIL: HPS_CALLER_JWT must be a Supabase Auth user access token (JWT). Do not use SUPABASE_ACCESS_TOKEN (CLI personal token)." -ForegroundColor Red
      exit 1
    }
    Write-Host "Caller JWT acquired (not printed)." -ForegroundColor Green
    exit 0
  }
}

$fromPassword = Acquire-CallerJwtFromPassword -SupabaseUrl $SUPABASE_URL
if ($fromPassword) {
  if ($fromPassword -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
    Write-Host "FAIL: acquired token is not a valid JWT shape." -ForegroundColor Red
    exit 1
  }
  Write-Host "Caller JWT acquired (not printed)." -ForegroundColor Green
  exit 0
}

Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
exit 1

