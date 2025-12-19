param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DatasetName = "ground_truth_v1",
  [string]$Posture = "underwrite",
  [int]$Limit = 50,
  [bool]$Force = $false,
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

function Invoke-JsonPost {
  param([string]$Url, $BodyObj)
  $json = $BodyObj | ConvertTo-Json -Depth 12
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -Headers $headers -Body $json
  if ($resp.StatusCode -ge 400) {
    throw ("POST failed {0}: {1}" -f $resp.StatusCode, $resp.Content)
  }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
}

function Assert {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) {
    throw $Message
  }
}

$body = @{
  dataset_name = $DatasetName
  posture      = $Posture
  limit        = [int]$Limit
  org_id       = $OrgId
  force        = [bool]$Force
}

Write-Host ("Supabase: {0}" -f $SupabaseUrl)
Write-Host ("Org: {0} | Dataset: {1} | Posture: {2} | Limit: {3}" -f $OrgId, $DatasetName, $Posture, $Limit)

$url = "$SupabaseUrl/functions/v1/v1-valuation-eval-run"

Write-Host "Running eval (first pass)..." -ForegroundColor Cyan
$resp1 = Invoke-JsonPost -Url $url -BodyObj $body
Assert $resp1.ok "Eval run failed on first pass."
$metrics1 = $resp1.metrics
$inputHash1 = $resp1.input_hash
Assert ($inputHash1 -and $inputHash1.Trim() -ne "") "input_hash missing from first eval."

Write-Host "Running eval (second pass, expect dedupe)..." -ForegroundColor Cyan
$resp2 = Invoke-JsonPost -Url $url -BodyObj $body
Assert $resp2.ok "Eval run failed on second pass."
$metrics2 = $resp2.metrics
$inputHash2 = $resp2.input_hash
Assert ($inputHash2 -and $inputHash2.Trim() -ne "") "input_hash missing from second eval."
Assert ($inputHash1 -eq $inputHash2) "input_hash changed between runs (should be stable)."
Assert ($resp2.deduped -eq $true) "Second eval was not deduped."

$cases = @()
if ($metrics1 -and $metrics1.cases) { $cases = @($metrics1.cases) }
$rangesPresent = @($cases | Where-Object { $_.range_low -ne $null -and $_.range_high -ne $null }).Count
if ($rangesPresent -gt 0) {
  Assert ($metrics1.in_range_rate_overall -ne $null) "in_range_rate_overall is null despite range data."
}

Write-Host ""
Write-Host "=== Proof Summary ===" -ForegroundColor Cyan
Write-Host ("input_hash: {0}" -f $inputHash1)
Write-Host ("eval_run_id_1: {0}" -f $resp1.eval_run_id)
Write-Host ("eval_run_id_2: {0}" -f $resp2.eval_run_id)
Write-Host ("deduped_second_run: {0}" -f $resp2.deduped)
Write-Host ("in_range_rate_overall: {0}" -f (Coalesce $metrics1.in_range_rate_overall "null"))
Write-Host ("ranges_present: {0}" -f $rangesPresent)
Write-Host "Proof completed." -ForegroundColor Green
