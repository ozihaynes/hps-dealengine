param(
  [Parameter(Mandatory = $true)]
  [string]$DatasetName,
  [Parameter(Mandatory = $true)]
  [string]$DealIdsPath,
  [string]$Posture = "base",
  [bool]$Recompute = $false,
  [bool]$ForceRefresh = $false
)

$ErrorActionPreference = "Stop"

function Coalesce($value, $fallback) {
  if ($null -ne $value) { return $value }
  return $fallback
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..") | Select-Object -ExpandProperty Path

$MigrationDir = Join-Path -Path $RepoRoot -ChildPath "supabase\\migrations"
if (Test-Path $MigrationDir) {
  $badMigrations = Get-ChildItem -Path $MigrationDir -File | Where-Object { $_.Name -notmatch '^\d{14}_.+\.sql$' }
  if ($badMigrations.Count -gt 0) {
    Write-Host "WARN: Migration filenames not matching ^\d{14}_.+\.sql$ will be skipped by supabase db push:" -ForegroundColor Yellow
    $badMigrations | ForEach-Object { Write-Host (" - {0}" -f $_.Name) }
  }
}

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
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\.env"),
  (Join-Path -Path $RepoRoot -ChildPath "supabase\\functions\\.env.local"),
  (Join-Path -Path $RepoRoot -ChildPath ".env")
)

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
  if (-not $anonKey) {
    Write-Host "FAIL: Cannot find NEXT_PUBLIC_SUPABASE_ANON_KEY for password grant." -ForegroundColor Red
    return $null
  }
  $body = @{ email = $email; password = $pwd } | ConvertTo-Json -Depth 3
  $headers = @{
    apikey       = $anonKey
    "Content-Type" = "application/json"
    Accept       = "application/json"
  }
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
    $parsed = $resp.Content | ConvertFrom-Json
    if ($parsed.access_token) {
      Write-Host "Caller JWT acquired via password grant (not printed)." -ForegroundColor Green
      return $parsed.access_token
    }
  } catch {
    Write-Host "FAIL: Password grant failed when attempting to acquire caller JWT." -ForegroundColor Red
    Write-Host $_
  }
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

  Write-Host "No caller JWT found in env; prompting for smoke credentials (will not be saved)." -ForegroundColor Yellow
  $promptEmail = Read-Host "Enter smoke user email"
  $securePwd = Read-Host "Enter smoke user password" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
  $plainPwd = ""
  try {
    $plainPwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
    }
  }
  if ($promptEmail -and $plainPwd) {
    $fromPrompt = Acquire-CallerJwtFromPassword -SupabaseUrl $SupabaseUrl -EmailOverride $promptEmail -PasswordOverride $plainPwd
    if ($fromPrompt) { return $fromPrompt }
  }

  return $null
}

function ConvertTo-Deterministic($value) {
  if ($null -eq $value) { return $null }

  if ($value -is [System.Collections.IDictionary]) {
    $ordered = [ordered]@{}
    foreach ($k in ($value.Keys | Sort-Object)) {
      $ordered[$k] = ConvertTo-Deterministic($value[$k])
    }
    return $ordered
  }

  if ($value -is [System.Management.Automation.PSObject]) {
    $ordered = [ordered]@{}
    foreach ($prop in ($value.PSObject.Properties.Name | Sort-Object)) {
      $ordered[$prop] = ConvertTo-Deterministic($value.$prop)
    }
    return $ordered
  }

  if ($value -is [System.Collections.IEnumerable] -and -not ($value -is [string])) {
    $arr = @()
    foreach ($item in $value) {
      $arr += ,(ConvertTo-Deterministic $item)
    }
    return $arr
  }

  return $value
}

function Get-StableJson($value) {
  $normalized = ConvertTo-Deterministic $value
  return ($normalized | ConvertTo-Json -Depth 25 -Compress)
}

function Get-StableHash($value) {
  $json = Get-StableJson $value
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $hashBytes = $sha.ComputeHash($bytes)
  return (-join ($hashBytes | ForEach-Object { $_.ToString("x2") }))
}

if (-not (Test-Path $DealIdsPath)) {
  Write-Host "FAIL: DealIdsPath not found: $DealIdsPath" -ForegroundColor Red
  exit 1
}

$dealIdsRaw = Get-Content -Raw -Path $DealIdsPath | ConvertFrom-Json
$DealIds = @()
foreach ($d in $dealIdsRaw) {
  if ($d) { $DealIds += $d.ToString() }
}

if ($DealIds.Count -eq 0) {
  Write-Host "FAIL: DealIdsPath must contain a JSON array of deal IDs." -ForegroundColor Red
  exit 1
}

$Env = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    $Env = $e
    break
  }
}

$SupabaseUrlCandidate = $env:NEXT_PUBLIC_SUPABASE_URL
if (-not $SupabaseUrlCandidate -and $Env -and $Env.ContainsKey("NEXT_PUBLIC_SUPABASE_URL")) {
  $SupabaseUrlCandidate = $Env["NEXT_PUBLIC_SUPABASE_URL"]
}
if (-not $SupabaseUrlCandidate) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL in env files or environment." -ForegroundColor Red
  exit 1
}
$SUPABASE_URL = $SupabaseUrlCandidate.Trim().TrimEnd("/")

$ANON_KEY = Find-NextPublicAnonKey
if (-not $ANON_KEY) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in env files or environment." -ForegroundColor Red
  exit 1
}

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $null
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
  exit 1
}

if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: Caller JWT must be a Supabase Auth user access token (JWT). Do not use SUPABASE_ACCESS_TOKEN (CLI personal token)." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey        = $ANON_KEY
  Authorization = "Bearer $ResolvedCallerJwt"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

function Invoke-JsonGet([string]$Url) {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers $headers
  if ($resp.StatusCode -ge 400) { throw "Request failed: $($resp.StatusCode) $Url" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function FetchLatestValuationRun([string]$DealId, [string]$Posture) {
  $qs = "deal_id=eq.$DealId&posture=eq.$Posture&order=created_at.desc&limit=1"
  $url = "$SUPABASE_URL/rest/v1/valuation_runs?$qs"
  $rows = Invoke-JsonGet $url
  if ($rows -and $rows.Count -gt 0) { return $rows[0] }
  return $null
}

function RunValuation([string]$DealId, [string[]]$EvalTags, [bool]$ForceRefresh, [string]$Posture) {
  $body = @{
    deal_id       = $DealId
    posture       = $Posture
    force_refresh = [bool]$ForceRefresh
  }
  if ($EvalTags -and $EvalTags.Count -gt 0) {
    $body.eval_tags = $EvalTags
  }
  $json = $body | ConvertTo-Json -Depth 6
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $json
  if ($resp.StatusCode -ge 400) { throw "v1-valuation-run failed with status $($resp.StatusCode)" }
  $parsed = $resp.Content | ConvertFrom-Json
  return $parsed
}

function FetchGroundTruth([string]$DealId) {
  $qsDeal = "deal_id=eq.$DealId&order=realized_date.desc.nullslast,created_at.desc&limit=1"
  $rows = Invoke-JsonGet "$SUPABASE_URL/rest/v1/valuation_ground_truth?$qsDeal"
  if ($rows -and $rows.Count -gt 0) { return $rows[0] }

  $subjectKey = "deal:$DealId"
  $qsSubject = "subject_key=eq.$subjectKey&order=realized_date.desc.nullslast,created_at.desc&limit=1"
  $rows2 = Invoke-JsonGet "$SUPABASE_URL/rest/v1/valuation_ground_truth?$qsSubject"
  if ($rows2 -and $rows2.Count -gt 0) { return $rows2[0] }

  return $null
}

function Median($nums) {
  $arr = @($nums | Sort-Object)
  if ($arr.Count -eq 0) { return $null }
  $mid = [math]::Floor($arr.Count / 2)
  if ($arr.Count % 2 -eq 0) {
    return ([double]($arr[$mid - 1]) + [double]($arr[$mid])) / 2
  }
  return [double]$arr[$mid]
}

function Percentile($nums, [double]$pct) {
  $arr = @($nums | Sort-Object)
  if ($arr.Count -eq 0) { return $null }
  $rank = [math]::Ceiling($pct * $arr.Count) - 1
  if ($rank -lt 0) { $rank = 0 }
  if ($rank -ge $arr.Count) { $rank = $arr.Count - 1 }
  return [double]$arr[$rank]
}

$EvalRunId = [guid]::NewGuid().ToString()
$AsOf = (Get-Date).ToUniversalTime().ToString("o")
$cases = @()
$OrgIdForEval = $null

Write-Host ("Dataset: {0}" -f $DatasetName) -ForegroundColor Cyan
Write-Host ("Deal count: {0}" -f $DealIds.Count)
Write-Host ("Posture: {0} | Recompute: {1} | ForceRefresh: {2}" -f $Posture, $Recompute, $ForceRefresh)

foreach ($dealId in $DealIds) {
  Write-Host ""
  Write-Host ("Processing deal {0}..." -f $dealId) -ForegroundColor Cyan
  $runPayload = $null

  try {
    if ($Recompute) {
      $tags = @("dataset:$DatasetName", "eval_run:$EvalRunId")
      $runPayload = RunValuation -DealId $dealId -EvalTags $tags -ForceRefresh:$ForceRefresh -Posture $Posture
      if (-not $runPayload.ok) { throw "valuation-run returned error $($runPayload.error)" }
      $valuationRun = $runPayload.valuation_run
    } else {
      $valuationRun = FetchLatestValuationRun -DealId $dealId -Posture $Posture
      if (-not $valuationRun) {
        Write-Host "WARN: No valuation_run found; skipping deal." -ForegroundColor Yellow
        $cases += [pscustomobject]@{
          deal_id      = $dealId
          status       = "missing_run"
          predicted_arv = $null
          realized_price = $null
          abs_error    = $null
          pct_error    = $null
          signed_error = $null
          confidence_grade = $null
          comp_kind_used = $null
          comp_count_used = $null
          valuation_run_id = $null
        }
        continue
      }
    }
  } catch {
    Write-Host ("FAIL: valuation run error for deal {0}: {1}" -f $dealId, $_) -ForegroundColor Red
    $cases += [pscustomobject]@{
      deal_id      = $dealId
      status       = "error"
      predicted_arv = $null
      realized_price = $null
      abs_error    = $null
      pct_error    = $null
      signed_error = $null
      confidence_grade = $null
      comp_kind_used = $null
      comp_count_used = $null
      valuation_run_id = $null
      error       = $_.ToString()
    }
    continue
  }

  if (-not $OrgIdForEval -and $valuationRun.org_id) {
    $OrgIdForEval = $valuationRun.org_id
  }

  $ground = FetchGroundTruth -DealId $dealId

  $predicted = $valuationRun.output.suggested_arv
  $confidenceGrade = Coalesce $valuationRun.output.valuation_confidence $valuationRun.output.confidence_details.grade
  $compKind = $valuationRun.output.suggested_arv_comp_kind_used
  $compCount = Coalesce $valuationRun.output.suggested_arv_comp_count_used $valuationRun.output.comp_count
  $policyHash = Coalesce $valuationRun.policy_hash $valuationRun.output.policy_hash
  $snapshotHash = $valuationRun.output.snapshot_hash
  $runOutputHash = Coalesce $valuationRun.output_hash $valuationRun.output.output_hash

  $realized = $null
  $realizedDate = $null
  $gtSource = $null
  if ($ground) {
    $realized = $ground.realized_price
    $realizedDate = $ground.realized_date
    $gtSource = $ground.source
  }

  $rangeLow = $valuationRun.output.suggested_arv_range_low
  $rangeHigh = $valuationRun.output.suggested_arv_range_high
  $inRange = $false
  if ($null -ne $realized -and $null -ne $rangeLow -and $null -ne $rangeHigh) {
    $realizedD = [double]$realized
    $lowD = [double]$rangeLow
    $highD = [double]$rangeHigh
    if ($realizedD -ge $lowD -and $realizedD -le $highD) {
      $inRange = $true
    }
  }

  $rangePct = $null
  if ($null -ne $rangeLow -and $null -ne $rangeHigh -and $null -ne $predicted -and [double]$predicted -ne 0) {
    $rangePct = (([double]$rangeHigh - [double]$rangeLow) / [double]$predicted)
  }

  $absError = $null
  $pctError = $null
  $signedError = $null
  if ($null -ne $predicted -and $null -ne $realized) {
    $signedError = [double]$predicted - [double]$realized
    $absError = [math]::Abs($signedError)
    if ([double]$realized -ne 0) {
      $pctError = $absError / [double]$realized
    }
  }

  $case = [pscustomobject]@{
    deal_id          = $dealId
    org_id           = $valuationRun.org_id
    status           = $valuationRun.status
    valuation_run_id = $valuationRun.id
    created_at       = $valuationRun.created_at
    predicted_arv    = $predicted
    realized_price   = $realized
    realized_date    = $realizedDate
    ground_truth_source = $gtSource
    predicted_range_low = $rangeLow
    predicted_range_high = $rangeHigh
    in_range         = $inRange
    range_pct        = $rangePct
    abs_error        = $absError
    pct_error        = $pctError
    signed_error     = $signedError
    confidence_grade = $confidenceGrade
    comp_kind_used   = $compKind
    comp_count_used  = $compCount
    policy_hash      = $policyHash
    snapshot_hash    = $snapshotHash
    output_hash      = $runOutputHash
  }

  $cases += $case

  Write-Host ("predicted_arv={0} | realized={1} | abs_error={2} | pct_error={3:P2}" -f `
    (Coalesce $predicted "null"), (Coalesce $realized "null"), (Coalesce $absError "null"), (Coalesce $pctError 0)) -ForegroundColor Gray
}

$casesWithGt = $cases | Where-Object { $_.realized_price -ne $null -and $_.abs_error -ne $null }
$absErrors = @($casesWithGt | ForEach-Object { $_.abs_error })
$pctErrors = @($casesWithGt | Where-Object { $_.pct_error -ne $null } | ForEach-Object { $_.pct_error })
$inRangeCount = (@($casesWithGt | Where-Object { $_.in_range })).Count

$mae = if ($absErrors.Count -gt 0) { ($absErrors | Measure-Object -Average).Average } else { $null }
$mape = if ($pctErrors.Count -gt 0) { ($pctErrors | Measure-Object -Average).Average } else { $null }
$medianError = Median $absErrors
$p90Error = Percentile $absErrors 0.9
$inRangeRateOverall = if ($casesWithGt.Count -gt 0) { $inRangeCount / [double]$casesWithGt.Count } else { $null }

$byConfidence = @{}
$groups = $casesWithGt | Group-Object -Property confidence_grade
foreach ($g in $groups) {
  $ae = @($g.Group | ForEach-Object { $_.abs_error })
  $countInRange = (@($g.Group | Where-Object { $_.in_range })).Count
  $rangePcts = @($g.Group | Where-Object { $_.range_pct -ne $null } | ForEach-Object { $_.range_pct })
  $byConfidence[$g.Name] = [ordered]@{
    count            = $g.Count
    mae              = if ($ae.Count -gt 0) { ($ae | Measure-Object -Average).Average } else { $null }
    in_range_rate    = if ($g.Count -gt 0) { $countInRange / [double]$g.Count } else { $null }
    mean_range_pct   = if ($rangePcts.Count -gt 0) { ($rangePcts | Measure-Object -Average).Average } else { $null }
  }
}

$metrics = [ordered]@{
  count_total             = $DealIds.Count
  count_with_ground_truth = $casesWithGt.Count
  mae                     = $mae
  mape                    = $mape
  median_abs_error        = $medianError
  p90_abs_error           = $p90Error
  in_range_rate_overall   = $inRangeRateOverall
  by_confidence           = $byConfidence
  cases                   = $cases
}

$params = @{
  dataset_name  = $DatasetName
  posture       = $Posture
  recompute     = $Recompute
  force_refresh = $ForceRefresh
  deal_ids      = $DealIds
}

$policyHashEval = ($cases | Where-Object { $_.policy_hash } | Select-Object -First 1).policy_hash
$outputHash = Get-StableHash $metrics

if ($OrgIdForEval) {
  $insertBody = @(
    @{
      id               = $EvalRunId
      dataset_name     = $DatasetName
      posture          = $Posture
      as_of            = $AsOf
      org_id           = $OrgIdForEval
      params           = $params
      metrics          = $metrics
      policy_hash      = $policyHashEval
      output_hash      = $outputHash
    }
  ) | ConvertTo-Json -Depth 8

  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/rest/v1/valuation_eval_runs" -Headers $headers -Body $insertBody
    if ($resp.StatusCode -ge 400) {
      Write-Host ("WARN: failed to insert valuation_eval_runs row ({0})" -f $resp.StatusCode) -ForegroundColor Yellow
    } else {
      Write-Host ("Inserted valuation_eval_runs row id={0}" -f $EvalRunId) -ForegroundColor Green
    }
  } catch {
    Write-Host "WARN: insert into valuation_eval_runs failed (continuing)." -ForegroundColor Yellow
    Write-Host $_
  }
} else {
  Write-Host "WARN: org_id missing; skipping valuation_eval_runs insert." -ForegroundColor Yellow
}

$summary = [pscustomobject]@{
  dataset   = $DatasetName
  posture   = $Posture
  recompute = $Recompute
  cases     = $DealIds.Count
  with_gt   = $casesWithGt.Count
  mae       = $mae
  mape      = $mape
  median    = $medianError
  p90       = $p90Error
  output_hash = $outputHash
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$summary | Format-Table | Out-String | Write-Host

Write-Host ""
Write-Host "Per-case results:" -ForegroundColor Cyan
$cases | Select-Object deal_id, predicted_arv, realized_price, abs_error, pct_error, confidence_grade, comp_kind_used, comp_count_used | Format-Table | Out-String | Write-Host

$logsDir = Join-Path $RepoRoot "scripts\\valuation\\logs"
if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}
$logPath = Join-Path $logsDir ("eval-{0}-{1}.log" -f $DatasetName, (Get-Date -Format "yyyyMMdd-HHmmss"))

$logPayload = @{
  dataset = $DatasetName
  posture = $Posture
  recompute = $Recompute
  force_refresh = $ForceRefresh
  as_of = $AsOf
  eval_run_id = $EvalRunId
  summary = $summary
  metrics = $metrics
}

$logJson = $logPayload | ConvertTo-Json -Depth 10
$logJson | Out-File -FilePath $logPath -Encoding utf8

Write-Host ("Log saved to {0}" -f $logPath) -ForegroundColor Gray
