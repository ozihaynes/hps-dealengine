param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DealId = "f84bab8d-e377-4512-a4c8-0821c23a82ea",
  [string]$Posture = "base",
  [string]$CallerJwt = $null
)

$ErrorActionPreference = "Stop"

function Coalesce {
  param($Value, $Fallback)
  if ($null -ne $Value) { return $Value }
  return $Fallback
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..") | Select-Object -ExpandProperty Path

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

$envPaths = @(
  (Join-Path -Path $RepoRoot -ChildPath ".env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\hps-dealengine\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\hps-dealengine\.env.development.local"),
  (Join-Path -Path $RepoRoot -ChildPath "apps\hps-dealengine\.env"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\.env")
)

$EnvData = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $envCandidate = Read-EnvFile $p
  if ($envCandidate.ContainsKey("SUPABASE_URL") -and $envCandidate.ContainsKey("SUPABASE_ANON_KEY")) { $EnvData = $envCandidate; break }
  if ($envCandidate.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $envCandidate.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) { $EnvData = $envCandidate; break }
}
if (-not $EnvData) {
  Write-Host "FAIL: Missing env with SUPABASE_URL / ANON_KEY" -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = Coalesce $EnvData["SUPABASE_URL"] $EnvData["NEXT_PUBLIC_SUPABASE_URL"]
$ANON_KEY = Coalesce $EnvData["SUPABASE_ANON_KEY"] $EnvData["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

function Invoke-PasswordGrant {
  param(
    [string]$Email,
    [string]$Password,
    [string]$SupabaseUrl,
    [string]$AnonKey
  )
  if (-not $Email -or -not $Password) { return $null }
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Depth 3
  $headers = @{ apikey = $AnonKey; "Content-Type" = "application/json"; Accept = "application/json" }
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
    $parsed = $resp.Content | ConvertFrom-Json
    if ($parsed.access_token) { return $parsed.access_token }
  } catch {
    return $null
  }
  return $null
}

function Find-CallerJwt {
  param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$CliSupplied,
    [string]$RepoRoot
  )

  $candidates = @()
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($CliSupplied) { $candidates += $CliSupplied }
  foreach ($c in $candidates) {
    if ($c -and $c.Trim() -ne "") { return $c.Trim() }
  }

  $credentialCandidates = New-Object System.Collections.ArrayList
  $seen = @{}
  function Add-CredCandidate {
    param([string]$Email, [string]$Password, [string]$Label)
    if (-not $Email -or -not $Password) { return }
    if ($seen.ContainsKey($Email)) { return }
    [void]$credentialCandidates.Add(@{ email = $Email; password = $Password; label = $Label })
    $seen[$Email] = $true
  }

  $resetScript = Join-Path $RepoRoot "scripts\reset-dev-auth-users.ts"
  if (Test-Path $resetScript) {
    $content = Get-Content -Path $resetScript -Raw
    $fallbacks = @(
      @{ email = "policy@hps.test.local"; password = "HpsDev!2025"; label = "policy" },
      @{ email = "manager@hps.test.local"; password = "HpsDev!2025"; label = "manager" },
      @{ email = "owner@hps.test.local"; password = "HpsDev!2025"; label = "owner" }
    ) | Where-Object { $content -match [regex]::Escape($_.email) -and $content -match [regex]::Escape($_.password) }
    foreach ($fb in $fallbacks) { Add-CredCandidate -Email $fb.email -Password $fb.password -Label $fb.label }
  }

  if ($env:HPS_SMOKE_EMAIL -and $env:HPS_SMOKE_PASSWORD) {
    Add-CredCandidate -Email $env:HPS_SMOKE_EMAIL -Password $env:HPS_SMOKE_PASSWORD -Label "env"
  }

  foreach ($cred in $credentialCandidates) {
    $token = Invoke-PasswordGrant -Email $cred.email -Password $cred.password -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey
    if ($token) {
      Write-Host ("Caller JWT acquired via password grant ({0}, not printed)." -f $cred.label) -ForegroundColor Green
      return $token
    }
  }

  return $null
}

if (-not $OrgId) { Write-Host "FAIL: OrgId is required" -ForegroundColor Red; exit 1 }
if (-not $DealId) { Write-Host "FAIL: DealId is required" -ForegroundColor Red; exit 1 }

$ResolvedCallerJwt = Find-CallerJwt -SupabaseUrl $SUPABASE_URL -AnonKey $ANON_KEY -CliSupplied $CallerJwt -RepoRoot $RepoRoot
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Provide HPS_CALLER_JWT/SUPABASE_CALLER_JWT or HPS_SMOKE_EMAIL/HPS_SMOKE_PASSWORD; dev fallback requires reset-dev-auth-users.ts." -ForegroundColor Red
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
  Prefer         = "return=representation"
}

function Invoke-JsonGet {
  param([string]$Url)
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers $headers
  if ($resp.StatusCode -ge 400) { throw "Request failed: $($resp.StatusCode) $Url" }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
}

function Invoke-JsonPatch {
  param(
    [string]$Url,
    $BodyObj
  )
  $json = $BodyObj | ConvertTo-Json -Depth 100 -Compress
  $resp = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $Url -Headers $headers -Body $json
  if ($resp.StatusCode -ge 300) { throw "PATCH failed: $($resp.StatusCode) $Url :: $json" }
  return $null
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    $BodyObj,
    [hashtable]$CustomHeaders = $null
  )
  $json = $BodyObj | ConvertTo-Json -Depth 100 -Compress
  $hdrs = @{}
  $headers.Keys | ForEach-Object { $hdrs[$_] = $headers[$_] }
  if ($CustomHeaders) {
    $CustomHeaders.Keys | ForEach-Object { $hdrs[$_] = $CustomHeaders[$_] }
  }
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -Headers $hdrs -Body $json
  if ($resp.StatusCode -ge 300) { throw "POST failed: $($resp.StatusCode) $Url :: $json" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function DeepCopy {
  param($Obj)
  if ($null -eq $Obj) { return $null }
  return $Obj | ConvertTo-Json -Depth 100 | ConvertFrom-Json
}

Write-Host ("Supabase: {0}" -f $SUPABASE_URL)
Write-Host ("Org: {0}" -f $OrgId)
Write-Host ("Deal: {0}" -f $DealId)
Write-Host ("Posture: {0}" -f $Posture)

$policyFilter = "org_id=eq.$OrgId&posture=eq.$Posture&is_active=eq.true&select=id,policy_json"
$policies = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?$policyFilter"
if (-not $policies -or $policies.Count -eq 0) { throw "No active policies found for org/posture." }

$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$backupDir = Join-Path $RepoRoot "supabase\backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$backupPath = Join-Path $backupDir ("prove-ensemble-uncertainty-{0}.json" -f $timestamp)

$policyBackups = @()
$policyOriginalMap = @{}
foreach ($p in $policies) {
  $originalJson = DeepCopy $p.policy_json
  $policyBackups += @{ id = $p.id; org_id = $OrgId; posture = $Posture; policy_json = $originalJson }
  $policyOriginalMap[$p.id] = $originalJson
}
$policyBackups | ConvertTo-Json -Depth 100 | Set-Content -Path $backupPath -Encoding UTF8
Write-Host ("Backup saved to {0}" -f $backupPath) -ForegroundColor Yellow

$ProofNonce = Get-Date -Format "yyyyMMddTHHmmssfffZ"

function Build-PatchedPolicy {
  param($Original)
  $patched = DeepCopy $Original
  if (-not $patched) { $patched = @{} }
  $valuation = $patched.valuation | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $valuation) { $valuation = @{} }

  $ensemble = $valuation.ensemble | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $ensemble) { $ensemble = @{} }
  $valuation.ensemble = @{
    enabled                 = $true
    version                 = Coalesce $ensemble.version "ensemble_v1"
    weights                 = Coalesce $ensemble.weights @{ comps = 0.7; avm = 0.3 }
    max_avm_weight          = Coalesce $ensemble.max_avm_weight 0.5
    min_comps_for_avm_blend = Coalesce $ensemble.min_comps_for_avm_blend 3
    proof_nonce             = $ProofNonce
  }

  $uncertainty = $valuation.uncertainty | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $uncertainty) { $uncertainty = @{} }
  $valuation.uncertainty = @{
    enabled    = $true
    version    = Coalesce $uncertainty.version "uncertainty_v1"
    method     = Coalesce $uncertainty.method "weighted_quantiles_v1"
    p_low      = Coalesce $uncertainty.p_low 0.10
    p_high     = Coalesce $uncertainty.p_high 0.90
    min_comps  = Coalesce $uncertainty.min_comps 3
    floor_pct  = Coalesce $uncertainty.floor_pct 0.05
    proof_nonce = $ProofNonce
  }

  $ceiling = $valuation.ceiling | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $ceiling) { $ceiling = @{} }
  $valuation.ceiling = @{
    enabled      = $false
    method       = Coalesce $ceiling.method "p75_active_listings"
    max_over_pct = Coalesce $ceiling.max_over_pct 0.05
  }

  $patched.valuation = $valuation
  return $patched
}

function Invoke-ValuationRun {
  param([bool]$ForceRefresh = $false)
  $body = @{ deal_id = $DealId; posture = $Posture; force_refresh = [bool]$ForceRefresh } | ConvertTo-Json -Depth 5
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
  $payload = $resp.Content | ConvertFrom-Json
  if (-not $payload.ok) { throw "Valuation run failed: $($payload.error)" }
  return $payload
}

function Assert-EnsembleOutputs {
  param($Output)
  if ($Output.suggested_arv_basis -ne "ensemble_v1") {
    throw "Proof check failed: expected suggested_arv_basis ensemble_v1."
  }
  if ($Output.ensemble_version -ne "ensemble_v1") {
    throw "Proof check failed: expected ensemble_version ensemble_v1."
  }
  if (-not $Output.selected_comps -or $Output.selected_comps.Count -le 0) {
    throw "Proof check failed: selected_comps missing."
  }
  $low = $Output.uncertainty_range_low
  $high = $Output.uncertainty_range_high
  if ($low -eq $null -or $high -eq $null) { throw "Proof check failed: uncertainty ranges missing." }
  if ($low -lt 0) { throw "Proof check failed: uncertainty low < 0." }
  if ($low -gt $high) { throw "Proof check failed: uncertainty low > high." }
}

$failureMessage = $null
$baseline = $null
$ensembleRun = $null

try {
  Write-Host "Running baseline valuation (features OFF)..." -ForegroundColor Cyan
  $runBaseline = Invoke-ValuationRun -ForceRefresh:$false
  $baseline = $runBaseline.valuation_run

  foreach ($p in $policies) {
    $patchedPolicy = Build-PatchedPolicy $policyOriginalMap[$p.id]
    $null = Invoke-JsonPatch "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $patchedPolicy }
    $verify = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)&select=policy_json"
    if (-not $verify -or $verify.Count -eq 0) { throw "Policy patch failed to return policy $($p.id)" }
    $val = $verify[0].policy_json.valuation
    if (-not $val.ensemble.enabled) { throw "Policy patch failed for $($p.id): ensemble.enabled not true" }
    if (-not $val.uncertainty.enabled) { throw "Policy patch failed for $($p.id): uncertainty.enabled not true" }
  }
  Write-Host ("Policies patched for ensemble/uncertainty proof: {0}" -f $policies.Count) -ForegroundColor Green

  Start-Sleep -Seconds 1
  $run2 = Invoke-ValuationRun -ForceRefresh:$false
  $ensembleRun = $run2.valuation_run
  Assert-EnsembleOutputs $ensembleRun.output

  $hashChanged = ($baseline.input_hash -ne $ensembleRun.input_hash) -or ($baseline.id -ne $ensembleRun.id)
  if (-not $hashChanged) { throw "Expected input_hash or valuation_run.id to change after enabling ensemble/uncertainty." }

  Start-Sleep -Seconds 1
  $run3 = Invoke-ValuationRun -ForceRefresh:$false
  $run3Data = $run3.valuation_run

  $outputHashEqual = $ensembleRun.output_hash -eq $run3Data.output_hash
  $runHashEqual = $ensembleRun.run_hash -eq $run3Data.run_hash

  if (-not ($outputHashEqual -and $runHashEqual)) {
    throw "Determinism check failed: run2 vs run3 hashes differ."
  }

  Write-Host "Proof checks passed." -ForegroundColor Green
  Write-Host ("Baseline input_hash: {0}" -f $baseline.input_hash)
  Write-Host ("Ensemble input_hash: {0}" -f $ensembleRun.input_hash)
  Write-Host ("Run2/Run3 output_hash equal: {0}" -f $outputHashEqual)
  Write-Host ("Run2/Run3 run_hash equal: {0}" -f $runHashEqual)
}
catch {
  $failureMessage = Coalesce $failureMessage $_.Exception.Message
}
finally {
  foreach ($p in $policies) {
    try {
      $null = Invoke-JsonPatch "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $policyOriginalMap[$p.id] }
    } catch {
      $failureMessage = Coalesce $failureMessage ("Restore failed for policy {0}: {1}" -f $p.id, $_.Exception.Message)
    }
  }
  Write-Host "Policies restored to original policy_json." -ForegroundColor Yellow
}

if ($failureMessage) {
  Write-Host ("FAIL: {0}" -f $failureMessage) -ForegroundColor Red
  exit 1
}

Write-Host "Proof completed successfully with ensemble/uncertainty affecting hashes and deterministic rerun." -ForegroundColor Green
