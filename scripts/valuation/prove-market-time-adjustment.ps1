param(
  [string]$DealId = $env:DEAL_ID,
  [Alias("SupabaseAccessToken")]
  [string]$CallerJwt = $null,
  [bool]$ForceRefresh = $false
)

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
  (Join-Path -Path $RepoRoot -ChildPath ".env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.development.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env"),
  (Join-Path -Path $RepoRoot -ChildPath ".env")
)

$Env = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    $Env = $e
    break
  }
}

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

function Acquire-CallerJwtFromPassword([string]$SupabaseUrl, [string]$EmailOverride, [string]$PasswordOverride) {
  $email = $EmailOverride
  $pwd = $PasswordOverride
  if (-not $email) { $email = $env:HPS_SMOKE_EMAIL }
  if (-not $pwd) { $pwd = $env:HPS_SMOKE_PASSWORD }
  if (-not $email -or -not $pwd) { return $null }
  $anonKey = Find-NextPublicAnonKey
  if (-not $anonKey) { return $null }
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
      Write-Host "Caller JWT acquired via password grant (not printed)." -ForegroundColor Green
      return $parsed.access_token
    }
  } catch {}
  return $null
}

function Get-CallerJwt {
  param(
    [string]$SupabaseUrl,
    [string]$CliSupplied
  )
  $candidates = @()
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($CliSupplied) { $candidates += $CliSupplied }

  foreach ($c in $candidates) {
    if ($c -and $c.Trim() -ne "") { return $c.Trim() }
  }

  $fromPassword = Acquire-CallerJwtFromPassword -SupabaseUrl $SupabaseUrl -EmailOverride $null -PasswordOverride $null
  if ($fromPassword) { return $fromPassword }

  return $null
}

if (-not $Env) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env files." -ForegroundColor Red
  exit 1
}

if (-not $DealId) {
  Write-Host "FAIL: Provide -DealId or set DEAL_ID env var." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = "https://zjkihnihhqmnhpxkecpy.supabase.co"
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $CallerJwt
$ResolvedCallerJwt = if ($ResolvedCallerJwt) { $ResolvedCallerJwt.Trim() } else { $null }
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey        = $ANON_KEY
  Authorization = "Bearer $ResolvedCallerJwt"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Target Supabase URL: {0}" -f $SUPABASE_URL)
Write-Host ("Deal: {0}" -f $DealId)

$body = @{ deal_id = $DealId; force_refresh = [bool]$ForceRefresh } | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
} catch {
  Write-Host "FAIL: v1-valuation-run invocation failed." -ForegroundColor Red
  Write-Host $_
  exit 1
}

$payload = $null
try { $payload = $resp.Content | ConvertFrom-Json } catch {}
if (-not $payload -or -not $payload.ok) {
  Write-Host ("FAIL: valuation-run error: {0}" -f (Coalesce $payload.error "unknown")) -ForegroundColor Red
  if ($payload.message) { Write-Host $payload.message }
  exit 1
}

$selectRun = "id,created_at,output,property_snapshot_id"
$encodedSelect = [uri]::EscapeDataString($selectRun)
$runsUrl = "{0}/rest/v1/valuation_runs?deal_id=eq.{1}&order=created_at.desc&limit=1&select={2}" -f $SUPABASE_URL, $DealId, $encodedSelect
$runResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $runsUrl -Headers $headers
$runRows = $runResp.Content | ConvertFrom-Json
if (-not $runRows -or $runRows.Count -lt 1) {
  Write-Host "FAIL: No valuation_run rows found for deal." -ForegroundColor Red
  exit 1
}

$runRow = $runRows[0]
$summary = $runRow.output.selection_summary
$mta = $summary.market_time_adjustment
$selected = $runRow.output.selected_comps
$withFactor = @()
if ($selected) {
  $withFactor = @($selected | Where-Object { $_.factor -ne $null -and $_.price_adjusted -ne $null })
}

Write-Host ""
Write-Host "=== Market Time Adjustment Proof ===" -ForegroundColor Cyan
Write-Host ("valuation_run.id: {0}" -f $runRow.id)
if ($mta) {
  Write-Host ("requested_as_of_period: {0}" -f (Coalesce $mta.requested_as_of_period "null"))
  Write-Host ("effective_as_of_period: {0}" -f (Coalesce $mta.effective_as_of_period "null"))
  Write-Host ("effective_as_of_value: {0}" -f (Coalesce $mta.effective_as_of_value "null"))
  Write-Host ("periods_used: {0}" -f ((Coalesce $mta.periods_used @()) -join ", "))
  Write-Host ("comps_adjusted_count: {0}" -f (Coalesce $mta.comps_adjusted_count "null"))
  Write-Host ("comps_missing_index_count: {0}" -f (Coalesce $mta.comps_missing_index_count "null"))
}

$fail = $false
if (-not $mta) { $fail = $true; Write-Host "FAIL: market_time_adjustment summary missing." -ForegroundColor Red }
if ($mta -and (Coalesce $mta.comps_adjusted_count 0) -le 0) {
  $fail = $true; Write-Host "FAIL: comps_adjusted_count <= 0." -ForegroundColor Red
}
if ($mta -and -not $mta.requested_as_of_period) {
  $fail = $true; Write-Host "FAIL: requested_as_of_period missing." -ForegroundColor Red
}
if ($mta -and (-not $mta.effective_as_of_period -or $null -eq $mta.effective_as_of_value)) {
  $fail = $true; Write-Host "FAIL: effective_as_of_period/value missing." -ForegroundColor Red
}
if (-not $withFactor -or $withFactor.Count -lt 1) {
  $fail = $true; Write-Host "FAIL: No selected comp with factor and price_adjusted present." -ForegroundColor Red
}

if (-not $fail -and $withFactor.Count -gt 0) {
  $first = $withFactor[0]
  Write-Host ("sample comp_id={0} price={1} price_adjusted={2} factor={3}" -f (Coalesce $first.comp_id (Coalesce $first.id "null")), (Coalesce $first.price "null"), (Coalesce $first.price_adjusted "null"), (Coalesce $first.factor "null"))
}

if ($fail) { exit 1 }

Write-Host ""
Write-Host "PASS: Market time adjustment proof satisfied." -ForegroundColor Green
