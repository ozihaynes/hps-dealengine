param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$DatasetName = "orlando_smoke_32828_sf_v2",
  [string]$Posture = "base",
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

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    $Headers,
    $BodyObj
  )
  $body = $null
  if ($null -ne $BodyObj) {
    $body = $BodyObj | ConvertTo-Json -Depth 12
  }
  $resp = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Url -Headers $Headers -Body $body
  if ($resp.StatusCode -ge 400) {
    throw ("Request failed {0}: {1}" -f $resp.StatusCode, $resp.Content)
  }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
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
  apikey        = $AnonKey
  Authorization = "Bearer $ResolvedCallerJwt"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Supabase: {0}" -f $SupabaseUrl)
Write-Host ("Org: {0} | Dataset: {1} | Posture: {2}" -f $OrgId, $DatasetName, $Posture)

# Fetch latest eval run
$evalUrl = "{0}/rest/v1/valuation_eval_runs?org_id=eq.{1}&dataset_name=eq.{2}&posture=eq.{3}&select=*&order=created_at.desc&limit=1" -f $SupabaseUrl, $OrgId, $DatasetName, $Posture
$evalRows = Invoke-Json -Method "GET" -Url $evalUrl -Headers $headers -BodyObj $null
if (-not $evalRows -or $evalRows.Count -eq 0) {
  if ($Posture -ne "underwrite") {
    Write-Host "No eval run found for posture=base; trying posture=underwrite fallback..." -ForegroundColor Yellow
    $fallbackUrl = "{0}/rest/v1/valuation_eval_runs?org_id=eq.{1}&dataset_name=eq.{2}&posture=eq.underwrite&select=*&order=created_at.desc&limit=1" -f $SupabaseUrl, $OrgId, $DatasetName
    $evalRows = Invoke-Json -Method "GET" -Url $fallbackUrl -Headers $headers -BodyObj $null
  }
  if (-not $evalRows -or $evalRows.Count -eq 0) {
    Write-Host "No eval run found for the specified filters (including fallback)." -ForegroundColor Yellow
    exit 0
  }
}
$eval = $evalRows[0]

Write-Host ""
Write-Host "=== Eval Run Summary ===" -ForegroundColor Cyan
Write-Host ("eval_run_id: {0}" -f $eval.id)
Write-Host ("created_at: {0}" -f $eval.created_at)
Write-Host ("input_hash: {0}" -f $eval.input_hash)
Write-Host ("count_total: {0}" -f ($eval.metrics.count_total))
Write-Host ("count_with_ground_truth: {0}" -f ($eval.metrics.count_with_ground_truth))
Write-Host ("mae: {0}" -f (Coalesce $eval.metrics.mae "null"))
Write-Host ("mape: {0}" -f (Coalesce $eval.metrics.mape "null"))
Write-Host ("in_range_rate_overall: {0}" -f (Coalesce $eval.metrics.in_range_rate_overall "null"))
Write-Host ("range_source_overall: {0}" -f (Coalesce $eval.metrics.range_source_overall "null"))

$cases = @()
if ($eval.metrics.cases) { $cases = @($eval.metrics.cases) }

$missingRunId = $cases | Where-Object { -not $_.valuation_run_id }
$missingPredicted = $cases | Where-Object { $null -eq $_.predicted_arv }
$missingRealized = $cases | Where-Object { $null -eq $_.realized_price }
$missingRange = $cases | Where-Object { ($null -eq $_.range_low) -or ($null -eq $_.range_high) }

Write-Host ""
Write-Host "=== Missing Counts ===" -ForegroundColor Cyan
Write-Host ("missing valuation_run_id: {0}" -f ($missingRunId.Count))
Write-Host ("missing predicted_arv: {0}" -f ($missingPredicted.Count))
Write-Host ("missing realized_price: {0}" -f ($missingRealized.Count))
Write-Host ("missing range_low/high: {0}" -f ($missingRange.Count))

$problemCases = $cases | Where-Object {
  (-not $_.valuation_run_id) -or
  ($null -eq $_.predicted_arv) -or
  ($null -eq $_.realized_price) -or
  ($null -eq $_.range_low) -or
  ($null -eq $_.range_high)
}

Write-Host ""
Write-Host "=== Problem Cases (table) ===" -ForegroundColor Cyan
if ($problemCases.Count -eq 0) {
  Write-Host "No problem cases detected." -ForegroundColor Green
} else {
  $problemCases |
    Select-Object deal_id, valuation_run_id, predicted_arv, realized_price, range_low, range_high, range_source, confidence_grade, comp_kind_used |
    Format-Table -AutoSize | Out-String | Write-Host
}

foreach ($pc in $problemCases) {
  Write-Host ""
  Write-Host ("--- Case: deal_id={0} ---" -f $pc.deal_id) -ForegroundColor Yellow

  # Deal info
  $dealUrl = "{0}/rest/v1/deals?id=eq.{1}&select=id,address,city,state,zip" -f $SupabaseUrl, $pc.deal_id
  $dealRow = $null
  try {
    $dealResp = Invoke-Json -Method "GET" -Url $dealUrl -Headers $headers -BodyObj $null
    if ($dealResp.Count -gt 0) { $dealRow = $dealResp[0] }
  } catch {
    Write-Host "WARN: deal fetch failed (RLS?)" -ForegroundColor Yellow
  }

  if ($dealRow) {
    Write-Host ("Deal: {0}, {1}, {2} {3}" -f (Coalesce $dealRow.address "-"), (Coalesce $dealRow.city "-"), (Coalesce $dealRow.state "-"), (Coalesce $dealRow.zip "-"))
  } else {
    Write-Host "Deal: unavailable (RLS?)"
  }

  $runRow = $null
  if ($pc.valuation_run_id) {
    $runUrl = "{0}/rest/v1/valuation_runs?id=eq.{1}&select=id,output,provenance,created_at" -f $SupabaseUrl, $pc.valuation_run_id
    try {
      $runResp = Invoke-Json -Method "GET" -Url $runUrl -Headers $headers -BodyObj $null
      if ($runResp.Count -gt 0) { $runRow = $runResp[0] }
    } catch {
      Write-Host "WARN: valuation_run fetch failed (RLS?)" -ForegroundColor Yellow
    }
  }

  if ($runRow) {
    $out = $runRow.output
    $prov = $runRow.provenance
    Write-Host ("valuation_run_id: {0}" -f $runRow.id)
    Write-Host ("created_at: {0}" -f $runRow.created_at)
    Write-Host ("warning_codes: {0}" -f ((Coalesce $out.warning_codes @()) -join ", "))
    Write-Host ("suggested_arv: {0}" -f (Coalesce $out.suggested_arv "null"))
    Write-Host ("suggested_arv_comp_kind_used: {0}" -f (Coalesce $out.suggested_arv_comp_kind_used "null"))
    $sel = $out.selection_summary
    if ($sel) {
      $ic = $sel.input_counts
      $ex = $sel.subject_comp_exclusions
      $icSummary = "null"
      if ($ic) {
        $icSummary = "closed_total=$($ic.closed_sale_total); listing_total=$($ic.listing_total); priced_closed=$($ic.closed_sale_priced); priced_listing=$($ic.listing_priced)"
      }
      Write-Host ("selection.input_counts: {0}" -f $icSummary)
      if ($null -ne $ex) { Write-Host ("selection.subject_comp_exclusions: {0}" -f $ex) }
    }
    if ($prov) {
      $stub = $prov.stub
      if ($null -ne $stub) { Write-Host ("provenance.stub: {0}" -f $stub) }
    }
  } else {
    Write-Host "valuation_run: unavailable (missing id or RLS?)"
  }
}
