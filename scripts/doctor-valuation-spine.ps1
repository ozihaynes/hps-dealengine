$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..") | Select-Object -ExpandProperty Path

# Requires:
# - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env file
# - DEAL_ID environment variable
# - SUPABASE_ACCESS_TOKEN environment variable (caller JWT; no service role)

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
  Join-Path -Path $RepoRoot -ChildPath ".env.local"
  Join-Path -Path $RepoRoot -ChildPath "apps\hps-dealengine\.env.local"
)

$Env = $null
$EnvSource = $null

foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    $Env = $e
    $EnvSource = $p
    break
  }
}

if (-not $Env) {
  Write-Host "FAIL: Could not find NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local files." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = $Env["NEXT_PUBLIC_SUPABASE_URL"].Trim().TrimEnd("/")
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

Write-Host ("Env source: {0}" -f (Split-Path -Leaf $EnvSource))

try { $uriObj = [Uri]$SUPABASE_URL } catch {
  Write-Host "FAIL: NEXT_PUBLIC_SUPABASE_URL is not a valid URL." -ForegroundColor Red
  Write-Host $SUPABASE_URL
  exit 1
}

$projectRefFromUrl = $uriObj.Host.Split(".")[0]
Write-Host ("Supabase project ref (from URL): {0}" -f $projectRefFromUrl)

$linkFile = Join-Path $RepoRoot "supabase\.temp\project-ref"
if (Test-Path $linkFile) {
  $linkedRef = (Get-Content $linkFile -Raw).Trim()
  if ($linkedRef -and $linkedRef -ne $projectRefFromUrl) {
    Write-Host ("WARN: supabase/.temp/project-ref ({0}) != env URL ref ({1})" -f $linkedRef, $projectRefFromUrl) -ForegroundColor Yellow
  } else {
    Write-Host "OK: linked project ref matches env URL ref" -ForegroundColor Green
  }
} else {
  Write-Host ("WARN: Missing supabase/.temp/project-ref. If needed: supabase link --project-ref {0}" -f $projectRefFromUrl) -ForegroundColor Yellow
}

$dealId = $env:DEAL_ID
if (-not $dealId) {
  Write-Host "FAIL: DEAL_ID env var is required to run valuation doctor." -ForegroundColor Red
  exit 1
}

$accessToken = $env:SUPABASE_ACCESS_TOKEN
if (-not $accessToken) {
  Write-Host "FAIL: SUPABASE_ACCESS_TOKEN env var (caller JWT) is required. Use a real user token, not service role." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey = $ANON_KEY
  Authorization = "Bearer $accessToken"
  Accept = "application/json"
  "Content-Type" = "application/json"
}

function Check-RestTable([string]$TableName) {
  $url = "$SUPABASE_URL/rest/v1/${TableName}?select=id&limit=1"
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $url -Headers $headers
    Write-Host ("OK: REST table {0} reachable (HTTP {1})" -f $TableName, $resp.StatusCode) -ForegroundColor Green
    return $true
  } catch {
    $status = $null
    $body = $null
    try {
      $r = $_.Exception.Response
      if ($r) {
        $status = [int]$r.StatusCode
        $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
        $body = $sr.ReadToEnd()
        $sr.Dispose()
      }
    } catch {}
    Write-Host ("FAIL: REST table {0} check failed (HTTP {1})" -f $TableName, $status) -ForegroundColor Red
    if ($body) { Write-Host $body }
    return $false
  }
}

$okTables = (Check-RestTable "valuation_runs") -and (Check-RestTable "property_snapshots")

function Check-FunctionsCli() {
  if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "WARN: supabase CLI not found; skipping functions list check" -ForegroundColor Yellow
    return $null
  }
  $out = & supabase functions list 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: supabase functions list failed (not linked/logged in?)" -ForegroundColor Yellow
    Write-Host $out.Trim()
    return $null
  }
  $need = @("v1-connectors-proxy","v1-valuation-run","v1-valuation-apply-arv")
  $allOk = $true
  foreach ($n in $need) {
    if ($out -match [Regex]::Escape($n)) {
      Write-Host ("OK: function present: {0}" -f $n) -ForegroundColor Green
    } else {
      Write-Host ("FAIL: missing function: {0}" -f $n) -ForegroundColor Red
      $allOk = $false
    }
  }
  return $allOk
}

$okFns = Check-FunctionsCli
if ($okFns -eq $null) { $okFns = $true } # don't fail if CLI unavailable

# Run a forced valuation to produce a fresh snapshot/run
Write-Host ("Running forced valuation for deal {0}..." -f $dealId)
$body = @{ deal_id = $dealId; force_refresh = $true } | ConvertTo-Json -Depth 5
try {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
} catch {
  Write-Host "FAIL: v1-valuation-run invocation failed" -ForegroundColor Red
  Write-Host $_
  exit 1
}

$payload = $null
try { $payload = $resp.Content | ConvertFrom-Json } catch {}
if (-not $payload) {
  Write-Host "FAIL: unable to parse valuation-run response." -ForegroundColor Red
  exit 1
}
if (-not $payload.ok) {
  $payloadError = $payload.error
  if (-not $payloadError) { $payloadError = "unknown" }
  Write-Host ("FAIL: valuation-run error: {0}" -f $payloadError) -ForegroundColor Red
  if ($payload.message) { Write-Host $payload.message }
  exit 1
}

$run = $payload.valuation_run
$snapshot = $payload.snapshot

$warningCodes = $run.output.warning_codes
if (-not $warningCodes) { $warningCodes = $run.output.warnings }

$closedSaleComps = 0
$saleListingComps = 0
if ($snapshot.comps) {
  $closedSaleComps = ($snapshot.comps | Where-Object { $_.comp_kind -eq "closed_sale" }).Count
  $saleListingComps = ($snapshot.comps | Where-Object { $_.comp_kind -eq "sale_listing" }).Count
}

Write-Host ""
Write-Host "=== Latest forced valuation_run ===" -ForegroundColor Cyan
Write-Host ("valuation_run_id: {0}" -f $run.id)
Write-Host ("created_at: {0}" -f $run.created_at)
Write-Host ("status: {0}" -f $run.status)
Write-Host ("suggested_arv_source_method: {0}" -f $run.output.suggested_arv_source_method)
Write-Host ("suggested_arv_comp_kind_used: {0}" -f $run.output.suggested_arv_comp_kind_used)
Write-Host ("warning_codes: {0}" -f ($warningCodes -join ", "))

$hasClosedRaw = ($snapshot.raw.closed_sales -ne $null)
$hasAvmRequestRaw = ($snapshot.raw.avm_request -ne $null)
Write-Host ""
Write-Host "=== Snapshot flags ===" -ForegroundColor Cyan
Write-Host ("as_of: {0}" -f $snapshot.as_of)
Write-Host ("expires_at: {0}" -f $snapshot.expires_at)
Write-Host ("has_closed_sales_raw: {0}" -f $hasClosedRaw)
Write-Host ("has_avm_request_raw: {0}" -f $hasAvmRequestRaw)
Write-Host ("closed_sale_comps: {0}" -f $closedSaleComps)
Write-Host ("sale_listing_comps: {0}" -f $saleListingComps)

if ($closedSaleComps -eq 0 -and $snapshot.raw.closed_sales) {
  $closedRaw = $snapshot.raw.closed_sales
  $primaryReq = $closedRaw.primary.request
  $stepoutReq = $closedRaw.stepout.request
  $reqToPrint = $primaryReq
  if (-not $reqToPrint) { $reqToPrint = $stepoutReq }
  Write-Host ""
  Write-Host "No closed-sale comps returned. Raw request info:" -ForegroundColor Yellow
  if ($reqToPrint) {
    Write-Host $reqToPrint
  } else {
    Write-Host "(no request recorded)"
  }
  $primaryResp = $closedRaw.primary.response
  $stepoutResp = $closedRaw.stepout.response
  $respToCheck = $primaryResp
  if (-not $respToCheck) { $respToCheck = $stepoutResp }
  if ($respToCheck -eq $null) {
    Write-Host "Response: null / missing"
  } elseif ($respToCheck.Count -eq 0) {
    Write-Host "Response: empty array"
  } else {
    Write-Host ("Response length: {0}" -f $respToCheck.Count)
  }
}

if ($okTables -and $okFns) {
  Write-Host ""
  Write-Host "PASS: Valuation Spine doctor OK" -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "FAIL: Issues detected. Fix FAIL lines above, then rerun pnpm doctor:valuation" -ForegroundColor Red
exit 1
