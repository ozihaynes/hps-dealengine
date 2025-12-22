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

  $email = $env:HPS_SMOKE_EMAIL
  $pwd = $env:HPS_SMOKE_PASSWORD

  if (-not $email -or -not $pwd) {
    $resetScript = Join-Path $RepoRoot "scripts\reset-dev-auth-users.ts"
    if (Test-Path $resetScript) {
      $content = Get-Content -Path $resetScript -Raw
      $fallbackEmail = "owner@hps.test.local"
      $fallbackPassword = "HpsDev!2025"
      if ($content -match [regex]::Escape($fallbackEmail) -and $content -match [regex]::Escape($fallbackPassword)) {
        $email = $fallbackEmail
        $pwd = $fallbackPassword
        Write-Host "Using dev fallback credentials from reset-dev-auth-users.ts (owner@hps.test.local)." -ForegroundColor Yellow
      }
    }
  }

  $token = Invoke-PasswordGrant -Email $email -Password $pwd -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey
  if ($token) {
    Write-Host "Caller JWT acquired via password grant (not printed)." -ForegroundColor Green
    return $token
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
$backupPath = Join-Path $backupDir ("prove-adjustments-ledger-{0}.json" -f $timestamp)

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
  if (-not $patched.valuation) { $patched | Add-Member -NotePropertyName valuation -NotePropertyValue (@{}) }
  if (-not $patched.valuation.adjustments) { $patched.valuation | Add-Member -NotePropertyName adjustments -NotePropertyValue (@{}) }

  $patched.valuation.adjustments.enabled = $true
  $patched.valuation.adjustments.version = "selection_v1_2"
  if ($patched.valuation.adjustments.PSObject.Properties.Name -contains "proof_nonce") {
    $patched.valuation.adjustments.proof_nonce = $ProofNonce
  } else {
    $patched.valuation.adjustments | Add-Member -NotePropertyName proof_nonce -NotePropertyValue $ProofNonce
  }

  if (-not $patched.valuation.adjustments.unit_values) {
    $patched.valuation.adjustments.unit_values = @{
      beds                = 0
      baths               = 0
      lot_per_sqft        = 0
      year_built_per_year = 0
    }
  }

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

function Assert-ProofOutputs {
  param(
    $Output,
    $PatchedUnitValues
  )
  if (($Output.suggested_arv_basis ?? "") -ne "adjusted_v1_2") {
    throw "Proof check failed: expected suggested_arv_basis=adjusted_v1_2, got '$($Output.suggested_arv_basis)'."
  }
  if (($Output.adjustments_version ?? "") -ne "selection_v1_2") {
    throw "Proof check failed: expected adjustments_version=selection_v1_2, got '$($Output.adjustments_version)'."
  }
  if (-not $Output.selected_comps -or $Output.selected_comps.Count -le 0) {
    throw "Proof check failed: selected_comps missing."
  }
  $firstComp = $Output.selected_comps[0]
  if (-not $firstComp.adjustments -or $firstComp.adjustments.Count -lt 2) {
    throw "Proof check failed: first comp missing adjustments."
  }
  $types = @($firstComp.adjustments | ForEach-Object { $_.type })
  if (-not ($types -contains "time")) { throw "Proof check failed: missing 'time' adjustment line item." }
  if (-not ($types -contains "sqft")) { throw "Proof check failed: missing 'sqft' adjustment line item." }

  $uv = $PatchedUnitValues
  $allZero = ($uv.beds -eq 0) -and ($uv.baths -eq 0) -and ($uv.lot_per_sqft -eq 0) -and ($uv.year_built_per_year -eq 0)
  if ($allZero) {
    $basis = [double](Coalesce $firstComp.value_basis_before_adjustments $firstComp.time_adjusted_price)
    $adjusted = [double](Coalesce $firstComp.adjusted_value $firstComp.value_basis_before_adjustments)
    if ([math]::Abs($basis - $adjusted) -gt 0.01) {
      throw "Proof check failed: adjusted_value ($adjusted) should equal basis ($basis) when unit_values are zero."
    }
  }
}

$failureMessage = $null
$runSummary = $null
$patchedUnitValues = $null

try {
  foreach ($p in $policies) {
    $patchedPolicy = Build-PatchedPolicy $policyOriginalMap[$p.id]
    $patchedUnitValues = $patchedPolicy.valuation.adjustments.unit_values
    $null = Invoke-JsonPatch "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $patchedPolicy }
    $verify = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)&select=policy_json"
    if (-not $verify -or $verify.Count -eq 0) { throw "Policy patch failed to return policy $($p.id)" }
    $patchedAdjustments = $verify[0].policy_json.valuation.adjustments
    if (-not $patchedAdjustments.enabled) { throw "Policy patch failed for $($p.id): adjustments.enabled not true" }
    if (($patchedAdjustments.version ?? "") -ne "selection_v1_2") {
      throw "Policy patch failed for $($p.id): adjustments.version not selection_v1_2"
    }
  }
  Write-Host ("Policies patched for proof: {0}" -f $policies.Count) -ForegroundColor Green

  Write-Host "Running valuation twice to prove determinism..." -ForegroundColor Cyan
  $run1 = Invoke-ValuationRun -ForceRefresh:$false
  Assert-ProofOutputs $run1.valuation_run.output $patchedUnitValues

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

  Write-Host ""
  Write-Host "=== Adjustments summary ===" -ForegroundColor Cyan
  Write-Host ("suggested_arv_basis: {0}" -f (Coalesce $out1.suggested_arv_basis "null"))
  Write-Host ("adjustments_version: {0}" -f (Coalesce $out1.adjustments_version "null"))
  Write-Host ("suggested_arv: {0}" -f (Coalesce $out1.suggested_arv "null"))

  $selectedComps = @()
  if ($out1.selected_comps) { $selectedComps = $out1.selected_comps }
  $firstComp = $null
  if ($selectedComps.Count -gt 0) { $firstComp = $selectedComps[0] }

  if ($firstComp) {
    Write-Host ""
    Write-Host ("Comp: {0} ({1})" -f (Coalesce $firstComp.id "unknown"), (Coalesce $firstComp.comp_kind "unknown")) -ForegroundColor Cyan
    Write-Host ("raw price: {0}" -f (Coalesce $firstComp.price "null"))
    Write-Host ("time_adjusted_price: {0}" -f (Coalesce $firstComp.time_adjusted_price $firstComp.price_adjusted))
    Write-Host ("value_basis_before_adjustments: {0}" -f (Coalesce $firstComp.value_basis_before_adjustments "null"))
    Write-Host ("adjusted_value: {0}" -f (Coalesce $firstComp.adjusted_value "null"))
    if ($firstComp.adjustments) {
      $idx = 1
      foreach ($adj in ($firstComp.adjustments | Select-Object -First 3)) {
        Write-Host ("[{0}] type={1} applied={2} amount={3} skip={4}" -f $idx, $adj.type, $adj.applied, (Coalesce $adj.amount_capped $adj.amount_raw), (Coalesce $adj.skip_reason "none"))
        $idx += 1
      }
    } else {
      Write-Host "No adjustments on first comp."
    }
  } else {
    Write-Host "No selected comps returned."
  }

  $runSummary = @{
    output_hash_equal = $equalOutputHash
    run_hash_equal    = $equalRunHash
  }

  if (-not ($equalOutputHash -and $equalRunHash)) {
    $failureMessage = "Determinism check failed: output_hash/run_hash mismatch."
  }
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

Write-Host "Proof completed successfully with deterministic hashes." -ForegroundColor Green
if ($runSummary) {
  Write-Host ("output_hash equal: {0}; run_hash equal: {1}" -f $runSummary.output_hash_equal, $runSummary.run_hash_equal)
}
