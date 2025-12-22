param(
  [string]$DealId = $env:DEAL_ID,
  [bool]$ForceRefresh = $false,
  [Alias("SupabaseAccessToken")]
  [string]$CallerJwt = $null
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

$SUPABASE_URL = $Env["NEXT_PUBLIC_SUPABASE_URL"].Trim()
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
  exit 1
}

if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: HPS_CALLER_JWT must be a Supabase Auth user access token (JWT)." -ForegroundColor Red
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

# Ensure policy token forces ATTOM attempt for this org
try {
  pwsh -File (Join-Path $PSScriptRoot "policy-set-public-records-subject.ps1") -OrgId "033ff93d-ff97-4af9-b3a1-a114d3c04da6" -PostureFilter "base" -CallerJwt $ResolvedCallerJwt | Out-Null
  Write-Host "Policy patched to prefer ATTOM for this org/posture." -ForegroundColor Green
} catch {
  Write-Host "WARN: Failed to patch policy-set-public-records-subject; continuing." -ForegroundColor Yellow
}

$body = @{ deal_id = $DealId; force_refresh = [bool]$ForceRefresh } | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
  $payload = $resp.Content | ConvertFrom-Json
} catch {
  Write-Host "FAIL: v1-valuation-run invocation failed." -ForegroundColor Red
  Write-Host $_
  exit 1
}

if (-not $payload -or -not $payload.ok) {
  Write-Host ("FAIL: valuation-run error: {0}" -f (Coalesce $payload.error "unknown")) -ForegroundColor Red
  if ($payload.message) { Write-Host $payload.message }
  exit 1
}

# Fetch latest valuation_run row
$selectRun = "id,created_at,output,property_snapshot_id"
$runsUrl = "{0}/rest/v1/valuation_runs?deal_id=eq.{1}&order=created_at.desc&limit=1&select={2}" -f $SUPABASE_URL, $DealId, [uri]::EscapeDataString($selectRun)
$runResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $runsUrl -Headers $headers
$runRows = $runResp.Content | ConvertFrom-Json
if (-not $runRows -or $runRows.Count -lt 1) {
  Write-Host "FAIL: No valuation_run rows found for deal." -ForegroundColor Red
  exit 1
}
$runRow = $runRows[0]

$snapshotId = $runRow.property_snapshot_id
if (-not $snapshotId) {
  Write-Host "FAIL: valuation_run missing property_snapshot_id." -ForegroundColor Red
  exit 1
}
$snapSelect = "id,raw"
$snapUrl = "{0}/rest/v1/property_snapshots?id=eq.{1}&select={2}" -f $SUPABASE_URL, $snapshotId, [uri]::EscapeDataString($snapSelect)
$snapResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $snapUrl -Headers $headers
$snapRows = $snapResp.Content | ConvertFrom-Json
if (-not $snapRows -or $snapRows.Count -lt 1) {
  Write-Host "FAIL: property_snapshot not found." -ForegroundColor Red
  exit 1
}
$snap = $snapRows[0]

$subjectSourcesOut = @()
if ($runRow.output -and $runRow.output.subject_sources) { $subjectSourcesOut = @($runRow.output.subject_sources) }
$hasSubjectSourcesFlag = $false
if ($runRow.output) { $hasSubjectSourcesFlag = ($runRow.output.PSObject.Properties.Name -contains "subject_sources") }

$snapSources = @()
if ($snap.raw -and $snap.raw.subject_sources) { $snapSources = @($snap.raw.subject_sources) }
$prSubject = $snap.raw.public_records.subject
$normalized = $prSubject.normalized
$rawResponse = $prSubject.raw.response

Write-Host ""
Write-Host "=== Proof ===" -ForegroundColor Cyan
Write-Host ("valuation_run.id: {0}" -f $runRow.id)
Write-Host ("output_has_subject_sources: {0}" -f $hasSubjectSourcesFlag)
Write-Host ("output.subject_sources: {0}" -f (($subjectSourcesOut -join ", ") ?? "null"))
Write-Host ("snapshot.subject_sources: {0}" -f (($snapSources -join ", ") ?? "null"))
Write-Host ("public_records.subject.attempted: {0}" -f (Coalesce $prSubject.attempted "null"))
Write-Host ("public_records.subject.skipped_reason: {0}" -f (Coalesce $prSubject.skipped_reason "null"))
Write-Host ("public_records.subject.error: {0}" -f (Coalesce $prSubject.error "null"))
Write-Host ("public_records.subject.provider: {0}" -f (Coalesce $prSubject.provider "null"))
Write-Host ("public_records.subject.as_of: {0}" -f (Coalesce $prSubject.as_of "null"))
if ($prSubject -and $prSubject.normalized) {
  Write-Host ("normalized.sqft: {0}" -f (Coalesce $prSubject.normalized.sqft "null"))
  Write-Host ("normalized.baths: {0}" -f (Coalesce $prSubject.normalized.baths "null"))
  Write-Host ("normalized.year_built: {0}" -f (Coalesce $prSubject.normalized.year_built "null"))
  Write-Host ("normalized.property_type: {0}" -f (Coalesce $prSubject.normalized.property_type "null"))
}

$fail = $false
if (-not $hasSubjectSourcesFlag) { $fail = $true; Write-Host "FAIL: output.subject_sources missing." -ForegroundColor Red }
if (-not $prSubject) { $fail = $true; Write-Host "FAIL: public_records.subject missing/null." -ForegroundColor Red }
if ($prSubject -and -not ($prSubject.PSObject.Properties.Name -contains "attempted")) {
  $fail = $true; Write-Host "FAIL: public_records.subject missing attempted flag." -ForegroundColor Red
}
if ($prSubject -and $prSubject.attempted -and -not ($snapSources -contains "attom")) {
  $fail = $true; Write-Host "FAIL: subject_sources missing attom despite attempt." -ForegroundColor Red
}
if ($prSubject -and $prSubject.attempted -and -not $prSubject.error) {
  if (-not $normalized) {
    $fail = $true; Write-Host "FAIL: public_records.subject.normalized missing despite attempted=true and no error." -ForegroundColor Red
  } else {
    if ($null -eq $normalized.sqft) { $fail = $true; Write-Host "FAIL: normalized.sqft is null." -ForegroundColor Red }
    if ($null -eq $normalized.baths) { $fail = $true; Write-Host "FAIL: normalized.baths is null." -ForegroundColor Red }
    if ($null -eq $normalized.year_built) { $fail = $true; Write-Host "FAIL: normalized.year_built is null." -ForegroundColor Red }
    if ($null -eq $normalized.property_type) { $fail = $true; Write-Host "FAIL: normalized.property_type is null." -ForegroundColor Red }
  }
}

if ($fail -and $rawResponse -and $rawResponse.property -and $rawResponse.property.Count -gt 0) {
  $p0 = $rawResponse.property[0]
  Write-Host "Debug: ATTOM summary.yearBuilt=${($p0.summary.yearBuilt)}, summary.propType=${($p0.summary.propType)}" -ForegroundColor Yellow
  Write-Host ("Debug: ATTOM rooms = {0}" -f (ConvertTo-Json $p0.building.rooms -Compress)) -ForegroundColor Yellow
  Write-Host ("Debug: ATTOM size = {0}" -f (ConvertTo-Json $p0.building.size -Compress)) -ForegroundColor Yellow
}

if ($fail) { exit 1 }

Write-Host ""
Write-Host "PASS: ATTOM enrichment proof satisfied." -ForegroundColor Green
