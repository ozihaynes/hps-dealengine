param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DealId = "f84bab8d-e377-4512-a4c8-0821c23a82ea",
  [string]$Posture = "base",
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
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\.env")
)

$EnvData = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("SUPABASE_URL") -and $e.ContainsKey("SUPABASE_ANON_KEY")) { $EnvData = $e; break }
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) { $EnvData = $e; break }
}
if (-not $EnvData) { Write-Host "FAIL: Missing env with SUPABASE_URL / ANON_KEY" -ForegroundColor Red; exit 1 }

$SUPABASE_URL = Coalesce $EnvData["SUPABASE_URL"] $EnvData["NEXT_PUBLIC_SUPABASE_URL"]
$ANON_KEY = Coalesce $EnvData["SUPABASE_ANON_KEY"] $EnvData["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

function Find-CallerJwt {
  param([string]$SupabaseUrl, [string]$CliSupplied)
  $candidates = @()
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($CliSupplied) { $candidates += $CliSupplied }
  foreach ($c in $candidates) { if ($c -and $c.Trim() -ne "") { return $c.Trim() } }

  $email = $env:HPS_SMOKE_EMAIL
  $pwd = $env:HPS_SMOKE_PASSWORD
  if ($email -and $pwd) {
    $body = @{ email = $email; password = $pwd } | ConvertTo-Json -Depth 3
    $headers = @{ apikey = $ANON_KEY; "Content-Type" = "application/json"; Accept = "application/json" }
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
      $parsed = $resp.Content | ConvertFrom-Json
      if ($parsed.access_token) {
        Write-Host "Caller JWT acquired via password grant (not printed)." -ForegroundColor Green
        return $parsed.access_token
      }
    } catch { }
  }
  return $null
}

if (-not $OrgId) { Write-Host "FAIL: OrgId is required" -ForegroundColor Red; exit 1 }
if (-not $DealId) { Write-Host "FAIL: DealId is required" -ForegroundColor Red; exit 1 }

$ResolvedCallerJwt = Find-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL/HPS_SMOKE_PASSWORD." -ForegroundColor Red
  exit 1
}
if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: Caller JWT must be a Supabase Auth access token (JWT)." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey         = $ANON_KEY
  Authorization  = "Bearer $ResolvedCallerJwt"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

function Get-Json($url) {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $url -Headers $headers
  if ($resp.StatusCode -ge 400) { throw "Request failed: $($resp.StatusCode) $url" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function Patch-Json($url, $bodyObj) {
  $json = $bodyObj | ConvertTo-Json -Depth 30 -Compress
  $resp = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $url -Headers $headers -Body $json
  if ($resp.StatusCode -ge 300) { throw "PATCH failed: $($resp.StatusCode) $url :: $json" }
}

Write-Host ("Supabase: {0}" -f $SUPABASE_URL)
Write-Host ("Org: {0}" -f $OrgId)
Write-Host ("Deal: {0}" -f $DealId)
Write-Host ("Posture: {0}" -f $Posture)

# Enable adjustments on active policies (keeps historical policy_versions untouched beyond patching current row)
$policyFilter = "org_id=eq.$OrgId&posture=eq.$Posture&is_active=eq.true"
$policies = Get-Json "$SUPABASE_URL/rest/v1/policies?$policyFilter"
if (-not $policies -or $policies.Count -eq 0) { throw "No active policies found for org/posture." }

$updated = 0
foreach ($p in $policies) {
  $policyJson = $p.policy_json
  if (-not $policyJson) { $policyJson = @{} }
  if (-not $policyJson.valuation) { $policyJson.valuation = @{} }
  if (-not $policyJson.valuation.adjustments) { $policyJson.valuation.adjustments = @{} }
  $adj = $policyJson.valuation.adjustments
  $adj.enabled = $true
  $adj.version = "selection_v1_2"
  if (-not $adj.rounding) { $adj.rounding = @{} }
  $adj.rounding.cents = 2
  $adj.missing_field_behavior = "skip"
  $adj.enabled_types = @("time", "sqft", "beds", "baths", "lot", "year_built")
  if (-not $adj.caps) { $adj.caps = @{} }
  $adj.caps.beds_delta_cap = 2
  $adj.caps.baths_delta_cap = 2
  $adj.caps.year_delta_cap = 20
  $adj.caps.lot_delta_cap_ratio = 0.5
  $adj.caps.sqft_basis_allowed_delta_ratio = 0.5
  if (-not $adj.unit_values) { $adj.unit_values = @{} }
  $adj.unit_values.beds = 1000
  $adj.unit_values.baths = 1500
  $adj.unit_values.lot_per_sqft = 1
  $adj.unit_values.year_built_per_year = 200
  $policyJson.valuation.adjustments = $adj

  Patch-Json "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $policyJson }
  Patch-Json "$SUPABASE_URL/rest/v1/policy_versions?org_id=eq.$OrgId&posture=eq.$Posture" @{ policy_json = $policyJson }
  $updated += 1
}
Write-Host ("Policies updated with adjustments enabled: {0}" -f $updated) -ForegroundColor Green

function Invoke-ValuationRun {
  param([bool]$ForceRefresh = $false)
  $body = @{ deal_id = $DealId; posture = $Posture; force_refresh = [bool]$ForceRefresh } | ConvertTo-Json -Depth 5
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
  $payload = $resp.Content | ConvertFrom-Json
  if (-not $payload.ok) { throw "Valuation run failed: $($payload.error)" }
  return $payload
}

Write-Host "Running valuation twice to prove determinism..." -ForegroundColor Cyan
$run1 = Invoke-ValuationRun -ForceRefresh:$false
Start-Sleep -Seconds 1
$run2 = Invoke-ValuationRun -ForceRefresh:$false

$out1 = $run1.valuation_run.output
$out2 = $run2.valuation_run.output
$equalOutputHash = $run1.valuation_run.output_hash -eq $run2.valuation_run.output_hash
$equalRunHash = $run1.valuation_run.run_hash -eq $run2.valuation_run.run_hash

Write-Host ""
Write-Host "=== Determinism check ===" -ForegroundColor Cyan
Write-Host ("output_hash equal: {0}" -f $equalOutputHash)
Write-Host ("run_hash equal: {0}" -f $equalRunHash)
Write-Host ("output_hash: {0}" -f $run1.valuation_run.output_hash)
Write-Host ("run_hash: {0}" -f $run1.valuation_run.run_hash)

$selectedComps = @()
if ($out1.selected_comps) { $selectedComps = $out1.selected_comps }
$firstComp = $null
if ($selectedComps.Count -gt 0) { $firstComp = $selectedComps[0] }

Write-Host ""
Write-Host "=== Adjustments summary ===" -ForegroundColor Cyan
Write-Host ("suggested_arv_basis: {0}" -f (Coalesce $out1.suggested_arv_basis "null"))
Write-Host ("adjustments_version: {0}" -f (Coalesce $out1.adjustments_version "null"))
Write-Host ("suggested_arv: {0}" -f (Coalesce $out1.suggested_arv "null"))

if ($firstComp) {
  Write-Host ""
  Write-Host ("Comp: {0} ({1})" -f (Coalesce $firstComp.id "unknown"), (Coalesce $firstComp.comp_kind "unknown")) -ForegroundColor Cyan
  Write-Host ("raw price: {0}" -f (Coalesce $firstComp.price "null"))
  Write-Host ("time_adjusted_price: {0}" -f (Coalesce $firstComp.time_adjusted_price $firstComp.price_adjusted))
  Write-Host ("value_basis_before_adjustments: {0}" -f (Coalesce $firstComp.value_basis_before_adjustments "null"))
  Write-Host ("adjusted_value: {0}" -f (Coalesce $firstComp.adjusted_value "null"))
  if ($firstComp.adjustments) {
    $idx = 1
    foreach ($adj in $firstComp.adjustments) {
      Write-Host ("[{0}] type={1} applied={2} amount={3} skip={4}" -f $idx, $adj.type, $adj.applied, (Coalesce $adj.amount_capped $adj.amount_raw), (Coalesce $adj.skip_reason "none"))
      $idx += 1
    }
  } else {
    Write-Host "No adjustments on first comp."
  }
} else {
  Write-Host "No selected comps returned."
}
