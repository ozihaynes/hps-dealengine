param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string[]]$DealIds = @(
    "67bc993b-5da9-4ae4-8c08-83d32556d57d",
    "f8b94461-8999-4b9f-92dd-5bd375b60f28"
  ),
  [string]$Posture = "base",
  [bool]$ForceRefresh = $true,
  [string]$CallerJwt = $null
)

$ErrorActionPreference = "Stop"

function Coalesce {
  param($Value, $Fallback)
  if ($null -ne $Value) { return $Value }
  return $Fallback
}

function Read-EnvFile {
  param([string]$Path)
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

function Find-NextPublicAnonKey {
  param([string[]]$Paths)
  if ($env:NEXT_PUBLIC_SUPABASE_ANON_KEY) { return $env:NEXT_PUBLIC_SUPABASE_ANON_KEY.Trim() }
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $lines = Get-Content $p
    foreach ($line in $lines) {
      if ($line -match '^\s*NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)$') {
        $v = $Matches[1].Trim()
        if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
        if ($v) { return $v }
      }
    }
  }
  return $null
}

function Acquire-CallerJwtFromPassword {
  param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$EmailOverride,
    [string]$PasswordOverride
  )
  $email = $EmailOverride
  $pwd = $PasswordOverride
  if (-not $email) { $email = $env:HPS_SMOKE_EMAIL }
  if (-not $pwd) { $pwd = $env:HPS_SMOKE_PASSWORD }
  if (-not $email -or -not $pwd) { return $null }
  $body = @{ email = $email; password = $pwd } | ConvertTo-Json -Depth 4
  $headers = @{ apikey = $AnonKey; "Content-Type" = "application/json"; Accept = "application/json" }
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
    $parsed = $resp.Content | ConvertFrom-Json
    if ($parsed.access_token) {
      Write-Host "Caller JWT acquired via password grant (not printed)." -ForegroundColor Green
      return $parsed.access_token
    }
  } catch {
    Write-Host "WARN: password grant failed." -ForegroundColor Yellow
  }
  return $null
}

function Get-CallerJwt {
  param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$CliSupplied
  )
  $candidates = @()
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($CliSupplied) { $candidates += $CliSupplied }
  foreach ($c in $candidates) {
    if ($c -and $c.Trim() -ne "") { return $c.Trim() }
  }
  return Acquire-CallerJwtFromPassword -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey -EmailOverride $null -PasswordOverride $null
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    $Headers,
    $BodyObj
  )
  $body = $null
  if ($null -ne $BodyObj) {
    $body = $BodyObj | ConvertTo-Json -Depth 12
  }
  $resp = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Url -Headers $Headers -Body $body
  if ($resp.StatusCode -ge 400) {
    throw ("Request failed {0}: {1}" -f $resp.StatusCode, $resp.Content)
  }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
}

if (-not $DealIds -or $DealIds.Count -eq 0) {
  Write-Host "FAIL: Provide at least one deal id." -ForegroundColor Red
  exit 1
}

$PostureNorm = ($Posture ?? "base").Trim().ToLower()
if ($PostureNorm -eq "underwrite") { $PostureNorm = "base" }
if (@("base", "conservative", "aggressive") -notcontains $PostureNorm) {
  Write-Host "FAIL: Posture must be base/conservative/aggressive." -ForegroundColor Red
  exit 1
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..") | Select-Object -ExpandProperty Path
$envPaths = @(
  (Join-Path -Path $RepoRoot -ChildPath ".env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.development.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\.env"),
  (Join-Path -Path $RepoRoot -ChildPath ".env")
)

$Env = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) { $Env = $e; break }
  if ($e.ContainsKey("SUPABASE_URL") -and $e.ContainsKey("SUPABASE_ANON_KEY")) { $Env = $e; break }
}

$SupabaseUrl = Coalesce $env:NEXT_PUBLIC_SUPABASE_URL $env:SUPABASE_URL
if (-not $SupabaseUrl -and $Env) {
  $SupabaseUrl = Coalesce $Env["NEXT_PUBLIC_SUPABASE_URL"] $Env["SUPABASE_URL"]
}
if (-not $SupabaseUrl) { $SupabaseUrl = "https://zjkihnihhqmnhpxkecpy.supabase.co" }
$SupabaseUrl = $SupabaseUrl.Trim().TrimEnd("/")

$AnonKey = Find-NextPublicAnonKey -Paths $envPaths
if (-not $AnonKey -and $Env) { $AnonKey = Coalesce $Env["SUPABASE_ANON_KEY"] $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] }
if (-not $AnonKey) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY." -ForegroundColor Red
  exit 1
}

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT/SUPABASE_CALLER_JWT or smoke creds." -ForegroundColor Red
  exit 1
}
if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: Caller JWT must be a Supabase Auth access token (JWT)." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey         = $AnonKey
  Authorization  = "Bearer $ResolvedCallerJwt"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Supabase: {0}" -f $SupabaseUrl)
Write-Host ("Org: {0} | Posture: {1}" -f $OrgId, $PostureNorm)
Write-Host ("Deals: {0}" -f ($DealIds -join ", "))

$fail = $false

foreach ($dealId in $DealIds) {
  Write-Host ""
  Write-Host ("=== Deal {0} ===" -f $dealId) -ForegroundColor Cyan
  $body = @{
    deal_id       = $dealId
    posture       = $PostureNorm
    force_refresh = [bool]$ForceRefresh
  }
  $runUrl = "$SupabaseUrl/functions/v1/v1-valuation-run"
  $resp = Invoke-Json -Method "POST" -Url $runUrl -Headers $headers -BodyObj $body
  if (-not $resp.ok) {
    Write-Host ("FAIL: valuation-run error: {0}" -f ($resp.error ?? "unknown")) -ForegroundColor Red
    if ($resp.message) { Write-Host $resp.message }
    $fail = $true
    continue
  }

  $out = $resp.valuation_run.output
  $warnings = @()
  if ($out.warning_codes) { $warnings = @($out.warning_codes) }
  $suggestedArv = $out.suggested_arv
  $rangeLow = Coalesce $out.suggested_arv_range_low $out.arv_range_low
  $rangeHigh = Coalesce $out.suggested_arv_range_high $out.arv_range_high

  Write-Host ("suggested_arv: {0}" -f (Coalesce $suggestedArv "null"))
  Write-Host ("range_low/high: {0} / {1}" -f (Coalesce $rangeLow "null"), (Coalesce $rangeHigh "null"))
  Write-Host ("warning_codes: {0}" -f ($warnings -join ", "))
  $hasGroupWarning = $warnings -contains "property_type_group_match_sfr_townhome"
  Write-Host ("property_type_group_match_sfr_townhome: {0}" -f $hasGroupWarning)

  if ($null -eq $suggestedArv) {
    Write-Host "FAIL: suggested_arv is null" -ForegroundColor Red
    $fail = $true
  }
  if ($null -eq $rangeLow -or $null -eq $rangeHigh) {
    Write-Host "FAIL: range_low/high missing" -ForegroundColor Red
    $fail = $true
  }
}

if ($fail) {
  exit 1
}

Write-Host ""
Write-Host "PASS: All deals produced suggested_arv and ranges." -ForegroundColor Green
