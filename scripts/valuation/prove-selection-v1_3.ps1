param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DealId = "f84bab8d-e377-4512-a4c8-0821c23a82ea",
  [string]$Posture = "base",
  [string]$CallerJwt = $null,
  [string]$SupabaseAccessToken = $env:SUPABASE_ACCESS_TOKEN
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
  (Join-Path -Path $RepoRoot -ChildPath "supabase\.env"),
  (Join-Path -Path $RepoRoot -ChildPath ".env")
)

$EnvData = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $candidate = Read-EnvFile $p
  if ($candidate.ContainsKey("SUPABASE_URL") -and $candidate.ContainsKey("SUPABASE_ANON_KEY")) { $EnvData = $candidate; break }
  if ($candidate.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $candidate.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) { $EnvData = $candidate; break }
}

$SUPABASE_URL = Coalesce $EnvData["SUPABASE_URL"] $EnvData["NEXT_PUBLIC_SUPABASE_URL"]
if (-not $SUPABASE_URL) { $SUPABASE_URL = "https://zjkihnihhqmnhpxkecpy.supabase.co" }
$SUPABASE_URL = $SUPABASE_URL.Trim().TrimEnd("/")
$ANON_KEY = Coalesce $EnvData["SUPABASE_ANON_KEY"] $EnvData["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
if (-not $ANON_KEY) { throw "Missing SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY" }

function Invoke-PasswordGrant {
  param([string]$SupabaseUrl, [string]$AnonKey, [string]$Email, [string]$Password)
  if (-not $Email -or -not $Password) { return $null }
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Depth 4
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
  param([string]$SupabaseUrl, [string]$AnonKey, [string]$Cli, [string]$DirectToken)
  $candidates = @()
  if ($DirectToken) { $candidates += $DirectToken }
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($Cli) { $candidates += $Cli }
  foreach ($c in $candidates) {
    if ($c -and $c.Trim() -ne "") { return $c.Trim() }
  }
  return Invoke-PasswordGrant -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey -Email $env:HPS_SMOKE_EMAIL -Password $env:HPS_SMOKE_PASSWORD
}

$ResolvedCallerJwt = Find-CallerJwt -SupabaseUrl $SUPABASE_URL -AnonKey $ANON_KEY -Cli $CallerJwt -DirectToken $SupabaseAccessToken
if (-not $ResolvedCallerJwt) { throw "Caller JWT missing; set HPS_CALLER_JWT/SUPABASE_CALLER_JWT or smoke creds." }

$headers = @{
  apikey         = $ANON_KEY
  Authorization  = "Bearer $ResolvedCallerJwt"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

function Invoke-JsonGet {
  param([string]$Url)
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers $headers -ErrorAction Stop
  if (-not ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)) {
    throw "GET failed $Url status=$($resp.StatusCode) body=$($resp.Content)"
  }
  if (-not $resp.Content) { return $null }
  return $resp.Content | ConvertFrom-Json
}
function Invoke-JsonPatch {
  param([string]$Url, $BodyObj)
  $json = $BodyObj | ConvertTo-Json -Depth 20
  $resp = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $Url -Headers $headers -Body $json -ErrorAction Stop
  if (-not ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)) {
    throw "PATCH failed $Url status=$($resp.StatusCode) body=$($resp.Content)"
  }
  if (-not $resp.Content) { return $null }
  return $resp.Content | ConvertFrom-Json
}
function Invoke-JsonPost {
  param([string]$Url, $BodyObj)
  $json = $BodyObj | ConvertTo-Json -Depth 20
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -Headers $headers -Body $json -ErrorAction Stop
  if (-not ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)) {
    throw "POST failed $Url status=$($resp.StatusCode) body=$($resp.Content)"
  }
  if (-not $resp.Content) { return $null }
  return $resp.Content | ConvertFrom-Json
}
function Assert { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw $Message } }

$backupDir = Join-Path $RepoRoot "supabase\backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$backupPath = Join-Path $backupDir ("prove-selection-v1_3-{0}.json" -f $timestamp)

$policyFilter = "org_id=eq.$OrgId&posture=eq.$Posture&is_active=eq.true&select=id,policy_json"
$policies = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?$policyFilter"
if (-not $policies -or $policies.Count -eq 0) { throw "No active policies found" }
$policyBackups = @()
$policyOriginal = @{}
foreach ($p in $policies) {
  $policyBackups += @{ id = $p.id; org_id = $OrgId; posture = $Posture; policy_json = $p.policy_json }
  $policyOriginal[$p.id] = $p.policy_json
}
$policyBackups | ConvertTo-Json -Depth 50 | Set-Content -Path $backupPath -Encoding UTF8
Write-Host ("Backup saved to {0}" -f $backupPath) -ForegroundColor Yellow

function BuildPatchedPolicy($policyJson) {
  $patched = $policyJson | ConvertTo-Json -Depth 50 | ConvertFrom-Json
  if (-not $patched.valuation) { $patched | Add-Member -NotePropertyName valuation -NotePropertyValue @{} }
  if (-not $patched.valuation.outlier_ppsf) {
    $patched.valuation.outlier_ppsf = @{ enabled = $true; method = "iqr"; iqr_k = 1.5; min_samples = 3 }
  }
  if (-not $patched.valuation.PSObject.Properties["selection_version"]) {
    $patched.valuation | Add-Member -NotePropertyName selection_version -NotePropertyValue "selection_v1_3"
  } else {
    $patched.valuation.selection_version = "selection_v1_3"
  }
  if (-not $patched.valuation.PSObject.Properties["selectionVersion"]) {
    $patched.valuation | Add-Member -NotePropertyName selectionVersion -NotePropertyValue "selection_v1_3"
  } else {
    $patched.valuation.selectionVersion = "selection_v1_3"
  }
  return $patched
}

function Invoke-ValuationRun([bool]$ForceRefresh) {
  $body = @{ deal_id = $DealId; posture = $Posture; force_refresh = $ForceRefresh }
  $resp = Invoke-JsonPost -Url "$SUPABASE_URL/functions/v1/v1-valuation-run" -BodyObj $body
  if (-not $resp.ok) { throw "valuation-run failed: $($resp.message)" }
  return $resp
}

$failureMessage = $null
try {
  foreach ($p in $policies) {
    $patched = BuildPatchedPolicy $policyOriginal[$p.id]
    $null = Invoke-JsonPatch -Url "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" -BodyObj @{ policy_json = $patched }
    $verify = Invoke-JsonGet "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)&select=policy_json"
    if (-not $verify -or $verify.Count -eq 0) { throw "Policy patch verification failed for $($p.id)" }
    $selVer = ($verify[0].policy_json.valuation.selection_version)
    if ($selVer -ne "selection_v1_3") { throw "Policy patch failed for $($p.id): selection_version=$selVer" }
  }
  Write-Host ("Policies patched for selection_v1_3: {0}" -f $policies.Count) -ForegroundColor Green

  Write-Host "Running valuation twice to assert determinism..." -ForegroundColor Cyan
  $run1 = Invoke-ValuationRun -ForceRefresh:$true
  Start-Sleep -Milliseconds 500
  $run2 = Invoke-ValuationRun -ForceRefresh:$false

  $out1 = $run1.valuation_run.output
  $out2 = $run2.valuation_run.output

  Assert ($out1.selection_version -eq "selection_v1_3") "selection_version missing or incorrect on first run"
  Assert ($out1.selection_diagnostics -ne $null) "selection_diagnostics missing on first run"
  Assert ($out1.selection_diagnostics.counts -ne $null) "diagnostics.counts missing"
  Assert ($out1.selection_diagnostics.outliers -ne $null) "diagnostics.outliers missing"
  Assert ($run1.valuation_run.output_hash -eq $run2.valuation_run.output_hash) "output_hash mismatch across runs"
  Assert ($run1.valuation_run.run_hash -eq $run2.valuation_run.run_hash) "run_hash mismatch across runs"

  Write-Host "=== Determinism proof ===" -ForegroundColor Cyan
  Write-Host ("output_hash: {0}" -f $run1.valuation_run.output_hash)
  Write-Host ("run_hash: {0}" -f $run1.valuation_run.run_hash)
  Write-Host ("selection_version: {0}" -f $out1.selection_version)
  Write-Host ("outliers_removed: {0}" -f (($out1.selection_diagnostics.outliers.removed_ids | Measure-Object).Count))

} catch {
  $failureMessage = $_.Exception.Message
  Write-Host ("FAIL: {0}" -f $failureMessage) -ForegroundColor Red
  throw
} finally {
  foreach ($p in $policies) {
    try {
      $null = Invoke-JsonPatch -Url "$SUPABASE_URL/rest/v1/policies?id=eq.$($p.id)" -BodyObj @{ policy_json = $policyOriginal[$p.id] }
    } catch { $failureMessage = Coalesce $failureMessage ("Restore failed for policy $($p.id): $($_.Exception.Message)") }
  }
  Write-Host "Policies restored to original policy_json." -ForegroundColor Yellow
}
