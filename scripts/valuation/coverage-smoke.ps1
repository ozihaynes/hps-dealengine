$ErrorActionPreference = "Stop"

param(
  [string]$DealId = $env:DEAL_ID,
  [string]$SupabaseAccessToken = $env:SUPABASE_ACCESS_TOKEN
)

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
  (Join-Path -Path $RepoRoot -ChildPath "apps\\hps-dealengine\\.env.local")
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

if (-not $Env) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local files." -ForegroundColor Red
  exit 1
}

if (-not $DealId) {
  Write-Host "FAIL: Provide -DealId or set DEAL_ID env var." -ForegroundColor Red
  exit 1
}

if (-not $SupabaseAccessToken) {
  Write-Host "FAIL: Provide -SupabaseAccessToken or set SUPABASE_ACCESS_TOKEN env var (caller JWT, not service role)." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = $Env["NEXT_PUBLIC_SUPABASE_URL"].Trim().TrimEnd("/")
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

$headers = @{
  apikey       = $ANON_KEY
  Authorization = "Bearer $SupabaseAccessToken"
  Accept       = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Target Supabase URL: {0}" -f $SUPABASE_URL)
Write-Host ("Deal: {0}" -f $DealId)

$body = @{ deal_id = $DealId; force_refresh = $true } | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$SUPABASE_URL/functions/v1/v1-valuation-run" -Headers $headers -Body $body
} catch {
  Write-Host "FAIL: v1-valuation-run invocation failed." -ForegroundColor Red
  Write-Host $_
  exit 1
}

$payload = $null
try { $payload = $resp.Content | ConvertFrom-Json } catch {}
if (-not $payload) {
  Write-Host "FAIL: Unable to parse valuation-run response." -ForegroundColor Red
  exit 1
}
if (-not $payload.ok) {
  Write-Host ("FAIL: valuation-run error: {0}" -f ($payload.error ?? "unknown")) -ForegroundColor Red
  if ($payload.message) { Write-Host $payload.message }
  exit 1
}

$run = $payload.valuation_run
$snapshot = $payload.snapshot

$closedSaleComps = 0
$saleListingComps = 0
if ($snapshot.comps) {
  $closedSaleComps = ($snapshot.comps | Where-Object { $_.comp_kind -eq "closed_sale" }).Count
  $saleListingComps = ($snapshot.comps | Where-Object { $_.comp_kind -eq "sale_listing" }).Count
}

$hasClosedRaw = ($snapshot.raw.closed_sales -ne $null)
$hasAvmRequestRaw = ($snapshot.raw.avm_request -ne $null)

Write-Host ""
Write-Host "=== Valuation run (forced) ===" -ForegroundColor Cyan
Write-Host ("valuation_run.id: {0}" -f $run.id)
Write-Host ("created_at: {0}" -f $run.created_at)
Write-Host ("suggested_arv_source_method: {0}" -f $run.output.suggested_arv_source_method)
Write-Host ("suggested_arv_comp_kind_used: {0}" -f $run.output.suggested_arv_comp_kind_used)
Write-Host ("suggested_arv_comp_count_used: {0}" -f $run.output.suggested_arv_comp_count_used)
Write-Host ("warning_codes: {0}" -f (($run.output.warning_codes ?? @()) -join ", "))

Write-Host ""
Write-Host "=== Snapshot raw coverage ===" -ForegroundColor Cyan
Write-Host ("has_closed_sales_raw: {0}" -f $hasClosedRaw)
Write-Host ("has_avm_request_raw: {0}" -f $hasAvmRequestRaw)
Write-Host ("closed_sale_comps: {0}" -f $closedSaleComps)
Write-Host ("sale_listing_comps: {0}" -f $saleListingComps)

if (-not $hasClosedRaw) {
  Write-Host "FAIL: raw.closed_sales missing -> backend likely not updated." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "PASS: valuation raw coverage present." -ForegroundColor Green
