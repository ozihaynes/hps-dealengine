param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DatasetName = "orlando_smoke_32828_sf_v2",
  [string]$Posture = "base",
  [int]$Limit = 50,
  [bool]$Force = $true,
  [string]$BaselineInputHash = "fa0ed738edbe9c0258b382bf86b453d5618bca19700f9cea01e6e12351f1f7b4",
  [string]$BaselineEvalRunId = "c8aef542-09b9-4a0b-9a6c-4ff6bf3b3de9",
  [string]$CallerJwt = $null,
  [string]$SupabaseAccessToken = $env:SUPABASE_ACCESS_TOKEN
)

$ErrorActionPreference = "Stop"

function Coalesce { param($Value, $Fallback) if ($null -ne $Value) { return $Value } return $Fallback }

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
  } catch { return $null }
  return $null
}

function Find-CallerJwt {
  param([string]$SupabaseUrl, [string]$AnonKey, [string]$Cli, [string]$DirectToken)
  $candidates = @()
  if ($DirectToken) { $candidates += $DirectToken }
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($Cli) { $candidates += $Cli }
  foreach ($c in $candidates) { if ($c -and $c.Trim() -ne "") { return $c.Trim() } }
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
$backupPath = Join-Path $backupDir ("prove-eval-selection-v1_3-{0}.json" -f $timestamp)

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

function Get-EvalRun([string]$EvalRunId) {
  if (-not $EvalRunId) { return $null }
  $res = Invoke-JsonGet "$SUPABASE_URL/rest/v1/valuation_eval_runs?id=eq.$EvalRunId&select=id,input_hash,metrics"
  if ($res -and $res.Count -gt 0) { return $res[0] }
  return $null
}

function ComputeRangesPresent($metrics) {
  if (-not $metrics) { return $null }
  $cases = @()
  if ($metrics.cases) { $cases = @($metrics.cases) }
  $rangesPresent = @($cases | Where-Object { $_.range_low -ne $null -and $_.range_high -ne $null }).Count
  return $rangesPresent
}

function RunEval() {
  $body = @{
    dataset_name = $DatasetName
    posture      = $Posture
    limit        = [int]$Limit
    org_id       = $OrgId
    force        = [bool]$Force
  }
  $resp = Invoke-JsonPost -Url "$SUPABASE_URL/functions/v1/v1-valuation-eval-run" -BodyObj $body
  if (-not $resp.ok) { throw "Eval run failed: $($resp.message)" }
  return $resp
}

function Format-Num($n) {
  if ($n -eq $null) { return "null" }
  $tmp = 0.0
  if (-not ([double]::TryParse($n, [ref]$tmp))) { return "$n" }
  return $tmp.ToString("0.######")
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

  $baseline = Get-EvalRun -EvalRunId $BaselineEvalRunId

  Write-Host "Running eval with selection_v1_3..." -ForegroundColor Cyan
  $evalResp = RunEval
  $metrics = $evalResp.metrics
  $inputHash = $evalResp.input_hash
  $evalRunId = $evalResp.eval_run_id
  $rangesPresent = ComputeRangesPresent $metrics
  $mae = Coalesce $metrics.mae_overall $metrics.mae
  $mape = Coalesce $metrics.mape_overall $metrics.mape

  Write-Host ""
  Write-Host "=== Baseline (Slice 7) ===" -ForegroundColor Yellow
  Write-Host ("baseline_input_hash: {0}" -f $BaselineInputHash)
  Write-Host ("baseline_eval_run_id: {0}" -f $BaselineEvalRunId)
  if ($baseline) {
    $bRanges = Coalesce $baseline.ranges_present (ComputeRangesPresent $baseline.metrics)
    $bMae = Coalesce $baseline.metrics.mae_overall $baseline.metrics.mae
    $bMape = Coalesce $baseline.metrics.mape_overall $baseline.metrics.mape
    $bInRange = Coalesce $baseline.metrics.in_range_rate_overall $baseline.metrics.in_range_rate
    Write-Host ("baseline_ranges_present: {0}" -f $bRanges)
    Write-Host ("baseline_in_range_rate_overall: {0}" -f (Format-Num $bInRange))
    Write-Host ("baseline_mae: {0}" -f (Format-Num $bMae))
    Write-Host ("baseline_mape: {0}" -f (Format-Num $bMape))
  } else {
    Write-Host "baseline metrics not found via eval_runs" -ForegroundColor Red
  }

  Write-Host ""
  Write-Host "=== selection_v1_3 run ===" -ForegroundColor Cyan
  Write-Host ("input_hash: {0}" -f $inputHash)
  Write-Host ("eval_run_id: {0}" -f $evalRunId)
  Write-Host ("ranges_present: {0}" -f $rangesPresent)
  Write-Host ("in_range_rate_overall: {0}" -f (Format-Num (Coalesce $metrics.in_range_rate_overall $metrics.in_range_rate)))
  Write-Host ("mae: {0}" -f (Format-Num $mae))
  Write-Host ("mape: {0}" -f (Format-Num $mape))

  if ($baseline -and $baseline.metrics) {
    $bRanges = Coalesce $baseline.ranges_present (ComputeRangesPresent $baseline.metrics)
    $bMae = Coalesce $baseline.metrics.mae_overall $baseline.metrics.mae
    $bMape = Coalesce $baseline.metrics.mape_overall $baseline.metrics.mape
    $bInRange = Coalesce $baseline.metrics.in_range_rate_overall $baseline.metrics.in_range_rate
    $deltaMae = ($mae - $bMae)
    $deltaMape = ($mape - $bMape)
    $deltaInRange = ((Coalesce $metrics.in_range_rate_overall $metrics.in_range_rate) - $bInRange)

    Write-Host ""
    Write-Host "=== Comparison (selection_v1_3 - baseline) ===" -ForegroundColor Green
    $rangesPresentSafe = Coalesce $rangesPresent 0
    $bRangesSafe = Coalesce $bRanges 0
    Write-Host ("delta_ranges_present: {0}" -f ($rangesPresentSafe - $bRangesSafe))
    Write-Host ("delta_in_range_rate: {0}" -f (Format-Num $deltaInRange))
    Write-Host ("delta_mae: {0}" -f (Format-Num $deltaMae))
    Write-Host ("delta_mape: {0}" -f (Format-Num $deltaMape))
  }

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
