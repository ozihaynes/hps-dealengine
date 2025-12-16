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

function Invoke-JsonDelete {
  param([string]$Url)
  $resp = Invoke-WebRequest -UseBasicParsing -Method Delete -Uri $Url -Headers $headers
  if ($resp.StatusCode -ge 300) { throw "DELETE failed: $($resp.StatusCode) $Url" }
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
$backupPath = Join-Path $backupDir ("prove-comp-overrides-{0}.json" -f $timestamp)

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

  $adj = $valuation.adjustments | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $adj) { $adj = @{} }
  $valuation.adjustments = @{
    enabled               = $true
    version               = "selection_v1_2"
    proof_nonce           = $ProofNonce
    rounding              = $adj.rounding
    missing_field_behavior = Coalesce $adj.missing_field_behavior "skip"
    enabled_types         = $adj.enabled_types
    caps                  = $adj.caps
    unit_values           = $adj.unit_values
  }

  $conc = $valuation.concessions | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $conc) { $conc = @{} }
  $valuation.concessions = @{
    enabled         = $true
    threshold_pct   = Coalesce $conc.threshold_pct 0.03
    reaction_factor = Coalesce $conc.reaction_factor 1.0
    precedence      = Coalesce $conc.precedence "usd_over_pct"
    proof_nonce     = $ProofNonce
  }

  $cond = $valuation.condition | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  if (-not $cond) { $cond = @{} }
  $valuation.condition = @{
    enabled = $true
  }

  $patched.valuation = $valuation
  Write-Host ("Patched adjustments payload: {0}" -f ($valuation.adjustments | ConvertTo-Json -Depth 20)) -ForegroundColor DarkGray
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

function Assert-OverrideOutputs {
  param($Output)
  if (-not $Output.selected_comps -or $Output.selected_comps.Count -le 0) {
    throw "Proof check failed: selected_comps missing."
  }
  $firstComp = $Output.selected_comps[0]
  if (-not $firstComp.adjustments -or $firstComp.adjustments.Count -lt 2) {
    throw "Proof check failed: first comp missing adjustments."
  }
  $types = @($firstComp.adjustments | ForEach-Object { $_.type })
  if (-not ($types -contains "concessions")) { throw "Proof check failed: missing 'concessions' adjustment line item." }
  if (-not ($types -contains "condition")) { throw "Proof check failed: missing 'condition' adjustment line item." }
}

$failureMessage = $null
$baseline = $null
$overrideRun = $null
$overrideCompId = $null
$overrideCompKind = $null

try {
  foreach ($p in $policies) {
    $patchedPolicy = Build-PatchedPolicy $policyOriginalMap[$p.id]
    $null = Invoke-JsonPatch "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $patchedPolicy }
    $verify = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)&select=policy_json"
    if (-not $verify -or $verify.Count -eq 0) { throw "Policy patch failed to return policy $($p.id)" }
    $val = $verify[0].policy_json.valuation
    if (-not $val.adjustments.enabled) {
      $adjJson = $val.adjustments | ConvertTo-Json -Depth 50
      throw "Policy patch failed for $($p.id): adjustments.enabled not true (value=$adjJson)"
    }
    if (-not $val.concessions.enabled) { throw "Policy patch failed for $($p.id): concessions.enabled not true" }
    if (-not $val.condition.enabled) { throw "Policy patch failed for $($p.id): condition.enabled not true" }
  }
  Write-Host ("Policies patched for proof: {0}" -f $policies.Count) -ForegroundColor Green

  Write-Host "Running baseline valuation..." -ForegroundColor Cyan
  $run1 = Invoke-ValuationRun -ForceRefresh:$false
  $baseline = $run1.valuation_run

  if (-not $baseline.output.selected_comps -or $baseline.output.selected_comps.Count -eq 0) {
    throw "Baseline run returned no selected comps."
  }
  $firstComp = $baseline.output.selected_comps[0]
  $overrideCompId = Coalesce $firstComp.id $null
  $overrideCompKind = Coalesce $firstComp.comp_kind $null
  if (-not $overrideCompId -or -not $overrideCompKind) {
    throw "Baseline comp missing id/comp_kind."
  }

  $overridePayload = @{
    org_id                   = $OrgId
    deal_id                  = $DealId
    comp_id                  = $overrideCompId
    comp_kind                = $overrideCompKind
    seller_credit_pct        = 0.05
    seller_credit_usd        = $null
    condition_adjustment_usd = -5000
    notes                    = "proof"
  }
  $prefHeaders = @{ Prefer = "resolution=merge-duplicates,return=representation" }
  $null = Invoke-JsonPost "$SUPABASE_URL/rest/v1/valuation_comp_overrides?on_conflict=org_id,deal_id,comp_id,comp_kind" $overridePayload $prefHeaders
  Write-Host ("Override upserted for comp {0} ({1})" -f $overrideCompId, $overrideCompKind) -ForegroundColor Green

  Start-Sleep -Seconds 1
  $run2 = Invoke-ValuationRun -ForceRefresh:$false
  $overrideRun = $run2.valuation_run
  Assert-OverrideOutputs $overrideRun.output

  $hashChanged = ($baseline.input_hash -ne $overrideRun.input_hash) -or ($baseline.id -ne $overrideRun.id)
  if (-not $hashChanged) {
    throw "Expected input_hash or valuation_run.id to change after override."
  }
  if (($overrideRun.output.overrides_applied_count ?? 0) -le 0) {
    throw "Expected overrides_applied_count > 0."
  }

  Start-Sleep -Seconds 1
  $run3 = Invoke-ValuationRun -ForceRefresh:$false
  $run3Data = $run3.valuation_run

  $outputHashEqual = $overrideRun.output_hash -eq $run3Data.output_hash
  $runHashEqual = $overrideRun.run_hash -eq $run3Data.run_hash

  if (-not ($outputHashEqual -and $runHashEqual)) {
    throw "Determinism check failed: run2 vs run3 hashes differ."
  }

  Write-Host "Proof checks passed." -ForegroundColor Green
  Write-Host ("Baseline input_hash: {0}" -f $baseline.input_hash)
  Write-Host ("Override input_hash: {0}" -f $overrideRun.input_hash)
  Write-Host ("Run2/Run3 output_hash equal: {0}" -f $outputHashEqual)
  Write-Host ("Run2/Run3 run_hash equal: {0}" -f $runHashEqual)
}
catch {
  $failureMessage = Coalesce $failureMessage $_.Exception.Message
}
finally {
  if ($overrideCompId -and $overrideCompKind) {
    try {
      $deleteUrl = "$SUPABASE_URL/rest/v1/valuation_comp_overrides?org_id=eq.$OrgId&deal_id=eq.$DealId&comp_id=eq.$overrideCompId&comp_kind=eq.$overrideCompKind"
      $null = Invoke-JsonDelete $deleteUrl
      Write-Host "Override row deleted." -ForegroundColor Yellow
    } catch {
      $failureMessage = Coalesce $failureMessage ("Override delete failed: {0}" -f $_.Exception.Message)
    }
  }

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

Write-Host "Proof completed successfully with overrides affecting hashes and deterministic rerun." -ForegroundColor Green
