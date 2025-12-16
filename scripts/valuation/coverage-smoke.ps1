param(
  [string]$DealId = $env:DEAL_ID,
  [Alias("SupabaseAccessToken")]
  [string]$CallerJwt = $null,
  [bool]$ForceRefresh = $false
)

$ErrorActionPreference = "Stop"

function Coalesce($value, $fallback) {
  if ($null -ne $value) { return $value }
  return $fallback
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..") | Select-Object -ExpandProperty Path

# Migration filename sanity check
$MigrationDir = Join-Path -Path $RepoRoot -ChildPath "supabase\\migrations"
if (Test-Path $MigrationDir) {
  $badMigrations = Get-ChildItem -Path $MigrationDir -File | Where-Object { $_.Name -notmatch '^\d{14}_.+\.sql$' }
  if ($badMigrations.Count -gt 0) {
    Write-Host "WARN: The following migration files do not match ^\d{14}_.+\.sql$ and will be skipped by supabase db push:" -ForegroundColor Yellow
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
  if (-not $anonKey) {
    Write-Host "FAIL: Cannot find NEXT_PUBLIC_SUPABASE_ANON_KEY for password grant." -ForegroundColor Red
    return $null
  }
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

if (-not $Env) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env files." -ForegroundColor Red
  exit 1
}

if (-not $DealId) {
  Write-Host "FAIL: Provide -DealId or set DEAL_ID env var." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = "https://zjkihnihhqmnhpxkecpy.supabase.co"
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD to allow automatic sign-in." -ForegroundColor Red
  exit 1
}

if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: HPS_CALLER_JWT must be a Supabase Auth user access token (JWT). Do not use SUPABASE_ACCESS_TOKEN (CLI personal token)." -ForegroundColor Red
  Write-Host "Set HPS_CALLER_JWT (preferred) or provide HPS_SMOKE_EMAIL + HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey       = $ANON_KEY
  Authorization = "Bearer $ResolvedCallerJwt"
  Accept       = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Target Supabase URL: {0}" -f $SUPABASE_URL)
Write-Host ("Deal: {0}" -f $DealId)

$body = @{ deal_id = $DealId; force_refresh = [bool]$ForceRefresh } | ConvertTo-Json -Depth 5

# Health check first (cheap, no RentCast)
try {
  $healthResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run?health=1" -Headers $headers
  if ($healthResp.StatusCode -ne 200) {
    Write-Host ("FAIL: health check returned {0}" -f $healthResp.StatusCode) -ForegroundColor Red
    Write-Host ($healthResp.Headers | Out-String)
    Write-Host ($healthResp.Content | Out-String)
    exit 1
  } else {
    Write-Host "Health check ok." -ForegroundColor Green
  }
} catch {
  Write-Host "FAIL: health check request failed." -ForegroundColor Red
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Host ("Status: {0}" -f $resp.StatusCode.value__)
    Write-Host "Headers:"
    $resp.Headers.GetEnumerator() | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Key, ($_.Value -join ", ")) }
    try {
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $text = $reader.ReadToEnd()
      if ($text.Length -gt 2000) { $text = $text.Substring(0,2000) }
      Write-Host "Body:"
      Write-Host $text
    } catch {}
  } else {
    Write-Host $_
  }
  exit 1
}

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
} catch {
  Write-Host "FAIL: v1-valuation-run invocation failed." -ForegroundColor Red
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Host ("Status: {0}" -f $resp.StatusCode.value__)
    Write-Host "Headers:"
    $resp.Headers.GetEnumerator() | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Key, ($_.Value -join ", ")) }
    try {
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $text = $reader.ReadToEnd()
      if ($text.Length -gt 2000) { $text = $text.Substring(0,2000) }
      Write-Host "Body:"
      Write-Host $text
    } catch {}
  } else {
    Write-Host $_
  }
  exit 1
}

$payload = $null
try { $payload = $resp.Content | ConvertFrom-Json } catch {}
if (-not $payload) {
  Write-Host "FAIL: Unable to parse valuation-run response." -ForegroundColor Red
  exit 1
}

if (-not $payload.ok) {
  $errMsg = Coalesce $payload.error "unknown"
  Write-Host ("FAIL: valuation-run error: {0}" -f $errMsg) -ForegroundColor Red
  if ($payload.message) { Write-Host $payload.message }
  exit 1
}

$run = $payload.valuation_run
$snapshot = $payload.snapshot

$closedSaleComps = 0
$saleListingComps = 0
$closedSalePriced = 0
$saleListingPriced = 0
if ($snapshot.comps) {
  $closed = $snapshot.comps | Where-Object { $_.comp_kind -eq "closed_sale" }
  $listings = $snapshot.comps | Where-Object { $_.comp_kind -eq "sale_listing" }
  $closedSaleComps = $closed.Count
  $saleListingComps = $listings.Count
  foreach ($c in $closed) {
    $p = $c.price
    $tmp = 0.0
    if ($null -ne $p -and [double]::TryParse($p.ToString(), [ref]$tmp)) { $closedSalePriced += 1 }
  }
  foreach ($c in $listings) {
    $p = $c.price
    $tmp = 0.0
    if ($null -ne $p -and [double]::TryParse($p.ToString(), [ref]$tmp)) { $saleListingPriced += 1 }
  }
}

$hasClosedRaw = ($snapshot.raw.closed_sales -ne $null)
$hasAvmRequestRaw = ($snapshot.raw.avm_request -ne $null)
$subjectResolved = $snapshot.raw.subject_property_resolved
$subjectHasSqft = ($null -ne $subjectResolved -and $null -ne $subjectResolved.sqft)
$subjectHasBeds = ($null -ne $subjectResolved -and $null -ne $subjectResolved.beds)
$subjectHasBaths = ($null -ne $subjectResolved -and $null -ne $subjectResolved.baths)
$subjectHasYear = ($null -ne $subjectResolved -and ($null -ne $subjectResolved.yearBuilt -or $null -ne $subjectResolved.year_built))
$subjectHasPropType = ($null -ne $subjectResolved -and (($null -ne $subjectResolved.propertyType) -or ($null -ne $subjectResolved.property_type)))
$subjectPropType = $null
if ($null -ne $subjectResolved) {
  if ($null -ne $subjectResolved.property_type) { $subjectPropType = $subjectResolved.property_type }
  elseif ($null -ne $subjectResolved.propertyType) { $subjectPropType = $subjectResolved.propertyType }
}

Write-Host ""
Write-Host "=== Valuation run (forced) ===" -ForegroundColor Cyan
Write-Host ("valuation_run.id: {0}" -f $run.id)
Write-Host ("created_at: {0}" -f $run.created_at)
Write-Host ("suggested_arv_source_method: {0}" -f $run.output.suggested_arv_source_method)
Write-Host ("suggested_arv_comp_kind_used: {0}" -f $run.output.suggested_arv_comp_kind_used)
Write-Host ("suggested_arv_comp_count_used: {0}" -f $run.output.suggested_arv_comp_count_used)
Write-Host ("suggested_arv: {0}" -f (Coalesce $run.output.suggested_arv "null"))
Write-Host ("suggested_arv_range_low: {0}" -f (Coalesce (Coalesce $run.output.suggested_arv_range_low $run.output.arv_range_low) "null"))
Write-Host ("suggested_arv_range_high: {0}" -f (Coalesce (Coalesce $run.output.suggested_arv_range_high $run.output.arv_range_high) "null"))
Write-Host ("valuation_confidence: {0}" -f (Coalesce $run.output.valuation_confidence "null"))
$confDetails = $run.output.confidence_details
if ($confDetails) {
  Write-Host ("confidence_details.grade: {0}" -f (Coalesce $confDetails.grade "null"))
  if ($confDetails.reasons) { Write-Host ("confidence_details.reasons: {0}" -f ($confDetails.reasons -join ", ")) }
}
$warningCodes = $run.output.warning_codes
if (-not $warningCodes) { $warningCodes = @() }
Write-Host ("warning_codes: {0}" -f ($warningCodes -join ", "))
$selectedIds = $run.output.selected_comp_ids
if (-not $selectedIds) { $selectedIds = @() }
Write-Host ("selected_comp_ids: {0}" -f ($selectedIds -join ", "))

$sel = $run.output.selection_summary
$activeAttempt = $null
if ($sel) { $activeAttempt = $sel.active_attempt }
$ladderStages = @()
if ($sel -and $sel.ladder -and $sel.ladder.stages) {
  $ladderStages = @($sel.ladder.stages) | ForEach-Object { $_ }
}
$stopReason = $null
if ($sel -and $sel.ladder) { $stopReason = $sel.ladder.stop_reason }
$outliers = $null
if ($sel -and $sel.outliers) { $outliers = $sel.outliers.removed_ids }
$outlierCount = 0
if ($outliers) { $outlierCount = $outliers.Count }

Write-Host ("selection_stop_reason: {0}" -f (Coalesce $stopReason "null"))
if (-not $ladderStages) { $ladderStages = @() }
Write-Host ("selection_stages: {0}" -f ($ladderStages -join " -> "))
Write-Host ("active_attempt: {0}" -f (Coalesce $activeAttempt "null"))
Write-Host ("outliers_removed_count: {0}" -f $outlierCount)
if (-not $outliers) { $outliers = @() }
Write-Host ("outliers_removed_ids: {0}" -f ($outliers -join ", "))

if ($sel -and $sel.candidate_counts) {
  Write-Host ("candidate_counts: closed_sales_total={0}, after_filters={1}, after_outliers={2}" -f $sel.candidate_counts.total, $sel.candidate_counts.after_filters, $sel.candidate_counts.after_outliers)
}
if ($sel -and $sel.filters -and $sel.filters.reasons_count) {
  $rc = $sel.filters.reasons_count
  $pairs = @()
  if ($rc -is [hashtable]) {
    $pairs = $rc.Keys | Sort-Object | ForEach-Object { "{0}={1}" -f $_, $rc[$_] }
  } else {
    $props = $rc.PSObject.Properties
    $pairs = $props | Sort-Object Name | ForEach-Object { "{0}={1}" -f $_.Name, $_.Value }
  }
  Write-Host ("filters.reasons_count: {0}" -f ($pairs -join "; "))
}
if ($sel -and $sel.selected) {
  Write-Host ("selection_selected_length: {0}" -f ($sel.selected | Measure-Object | Select-Object -ExpandProperty Count))
}
if ($sel -and $sel.closed_attempt) {
  $closedCC = $sel.closed_attempt.candidate_counts
  if ($closedCC) {
    Write-Host ("closed_attempt.candidate_counts: total={0}, after_filters={1}, after_outliers={2}" -f $closedCC.total, $closedCC.after_filters, $closedCC.after_outliers)
  }
  $rc = $null
  if ($sel.closed_attempt.filters) { $rc = $sel.closed_attempt.filters.reasons_count }
  if ($null -ne $rc) {
    $pairs = @()
    if ($rc -is [hashtable]) {
      $pairs = $rc.Keys | Sort-Object | ForEach-Object { "{0}={1}" -f $_, $rc[$_] }
    } else {
      $pairs = $rc.PSObject.Properties | Sort-Object Name | ForEach-Object { "{0}={1}" -f $_.Name, $_.Value }
    }
    Write-Host ("closed_attempt.reasons_count: {0}" -f ($pairs -join "; "))
  }
}
if ($sel -and $sel.listing_attempt) {
  $listCC = $sel.listing_attempt.candidate_counts
  if ($listCC) {
    Write-Host ("listing_attempt.candidate_counts: total={0}, after_filters={1}, after_outliers={2}" -f $listCC.total, $listCC.after_filters, $listCC.after_outliers)
  }
  $rc2 = $null
  if ($sel.listing_attempt.filters) { $rc2 = $sel.listing_attempt.filters.reasons_count }
  if ($null -ne $rc2) {
    $pairs2 = @()
    if ($rc2 -is [hashtable]) {
      $pairs2 = $rc2.Keys | Sort-Object | ForEach-Object { "{0}={1}" -f $_, $rc2[$_] }
    } else {
      $pairs2 = $rc2.PSObject.Properties | Sort-Object Name | ForEach-Object { "{0}={1}" -f $_.Name, $_.Value }
    }
    Write-Host ("listing_attempt.reasons_count: {0}" -f ($pairs2 -join "; "))
  }
}

if ($sel -and $sel.market_time_adjustment) {
  $mta = $sel.market_time_adjustment
  Write-Host ("market_time_adjustment.enabled: {0}" -f (Coalesce $mta.enabled "null"))
  Write-Host ("market_time_adjustment.min_days_old: {0}" -f (Coalesce $mta.min_days_old "null"))
  Write-Host ("market_time_adjustment.comps_adjusted_count: {0}" -f (Coalesce $mta.comps_adjusted_count "null"))
  Write-Host ("market_time_adjustment.comps_missing_index_count: {0}" -f (Coalesce $mta.comps_missing_index_count "null"))
  Write-Host ("market_time_adjustment.geo_key: {0}" -f (Coalesce $mta.geo_key "null"))
  Write-Host ("market_time_adjustment.series_id: {0}" -f (Coalesce $mta.series_id "null"))
}

if ($sel -and $sel.selected) {
  Write-Host ""
  Write-Host "=== Selected comps (first 5) ===" -ForegroundColor Cyan
  $sampleSelected = $sel.selected | Select-Object -First 5
  $idxSel = 1
  foreach ($c in $sampleSelected) {
    $compId = Coalesce $c.comp_id (Coalesce $c.id "null")
    $factor = $null
    if ($null -ne $c.factor) { $factor = $c.factor }
    elseif ($null -ne $c.market_time_adjustment_factor) { $factor = $c.market_time_adjustment_factor }
    Write-Host (
      "[{0}] comp_id={1} close_date={2} price={3} price_adjusted={4} factor={5} days_old={6}" -f `
        $idxSel, `
        $compId, `
        (Coalesce $c.close_date "null"), `
        (Coalesce $c.price "null"), `
        (Coalesce $c.price_adjusted "null"), `
        (Coalesce $factor "null"), `
        (Coalesce $c.days_old "null")`
    )
    $idxSel += 1
  }
}

$consensus = 560000
$delta = $null
if ($run.output.suggested_arv) {
  $delta = [double]$run.output.suggested_arv - $consensus
  $deltaPct = $delta / $consensus
  Write-Host ("delta_vs_560000: {0} ({1:P2})" -f [math]::Round($delta,2), $deltaPct)
} else {
  Write-Host "delta_vs_560000: n/a (no suggested_arv)"
}

Write-Host ""
Write-Host "=== Snapshot raw coverage ===" -ForegroundColor Cyan
Write-Host ("has_closed_sales_raw: {0}" -f $hasClosedRaw)
Write-Host ("has_avm_request_raw: {0}" -f $hasAvmRequestRaw)
Write-Host ("closed_sale_comps: {0}" -f $closedSaleComps)
Write-Host ("closed_sale_priced_count: {0}" -f $closedSalePriced)
Write-Host ("sale_listing_comps: {0}" -f $saleListingComps)
Write-Host ("sale_listing_priced_count: {0}" -f $saleListingPriced)
Write-Host ("subject_fields_present: sqft={0}, beds={1}, baths={2}, year={3}, propertyType={4}" -f $subjectHasSqft, $subjectHasBeds, $subjectHasBaths, $subjectHasYear, $subjectHasPropType)
Write-Host ("subject_property_type: {0}" -f (Coalesce $subjectPropType "null"))

Write-Host ""
Write-Host "=== Sample closed_sale comps (first 3) ===" -ForegroundColor Cyan
if ($closedSaleComps -gt 0) {
  $sample = $snapshot.comps | Where-Object { $_.comp_kind -eq "closed_sale" } | Select-Object -First 3
  $idx = 1
  foreach ($c in $sample) {
    $priceType = if ($null -ne $c.price) { $c.price.GetType().FullName } else { "null" }
    $compPropType = $null
    if ($null -ne $c.property_type) { $compPropType = $c.property_type } elseif ($null -ne $c.propertyType) { $compPropType = $c.propertyType }
    Write-Host ("[{0}] id={1} kind={2} price={3} (type={4}) sqft={5} property_type={6}" -f $idx, $c.id, $c.comp_kind, $c.price, $priceType, $c.sqft, (Coalesce $compPropType "null"))
    $idx += 1
  }
} else {
  Write-Host "no closed_sale comps"
}

if (-not $hasClosedRaw) {
  Write-Host "FAIL: raw.closed_sales missing -> backend likely not updated." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "PASS: valuation raw coverage present." -ForegroundColor Green
