param(
  [Parameter(Mandatory = $true)]
  [string]$DealId,
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$Posture = "base",
  [bool]$ForceRefresh = $true,
  [string]$CallerJwt = $null
)

$ErrorActionPreference = "Stop"

function Coalesce {
  param($Value, $Fallback)
  if ($null -ne $Value) { return $Value }
  return $Fallback
}

function Normalize-Token {
  param($Value)
  if ($Value -isnot [string]) { return $null }
  $trim = $Value.Trim().ToLower()
  if ($trim -eq "") { return $null }
  return ($trim -replace '[^a-z0-9]', '')
}

function Normalize-AddressKey {
  param(
    [string]$Address,
    [string]$City,
    [string]$State,
    [string]$Postal
  )
  $parts = @(
    Normalize-Token $Address
    Normalize-Token $City
    Normalize-Token $State
    Normalize-Token $Postal
  ) | Where-Object { $_ }
  if ($parts.Count -eq 0) { return $null }
  return ($parts -join "|")
}

function Normalize-CompKey {
  param($Comp)
  $addresses = @(
    $Comp.address,
    $Comp.address_line1,
    $Comp.addressLine1,
    $Comp.formattedAddress,
    $Comp.street,
    $Comp.street_address
  )
  $city = Coalesce $Comp.city (Coalesce $Comp.city_name (Coalesce $Comp.locality $Comp.municipality))
  $state = Coalesce $Comp.state (Coalesce $Comp.state_code (Coalesce $Comp.region $Comp.region_code))
  $postal = Coalesce $Comp.postal_code (Coalesce $Comp.zip (Coalesce $Comp.zip_code (Coalesce $Comp.zipCode $Comp.postalCode)))
  foreach ($addr in $addresses) {
    $key = Normalize-AddressKey -Address $addr -City $city -State $state -Postal $postal
    if ($key) { return $key }
  }
  return $null
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

if (-not $DealId) {
  Write-Host "FAIL: Provide -DealId or set DEAL_ID." -ForegroundColor Red
  exit 1
}

$PostureNormalized = $Posture
if ($PostureNormalized) {
  $lower = $PostureNormalized.Trim().ToLower()
  if ($lower -eq "underwrite") { $PostureNormalized = "base" }
  elseif (@("base", "conservative", "aggressive") -notcontains $lower) {
    Write-Host "FAIL: Posture must be one of base/conservative/aggressive/underwrite." -ForegroundColor Red
    exit 1
  } else {
    $PostureNormalized = $lower
  }
} else {
  $PostureNormalized = "base"
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
  apikey         = $AnonKey
  Authorization  = "Bearer $ResolvedCallerJwt"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Supabase: {0}" -f $SupabaseUrl)
Write-Host ("Org: {0} | Deal: {1} | Posture: {2}" -f $OrgId, $DealId, $PostureNormalized)

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    $BodyObj
  )
  $body = $null
  if ($null -ne $BodyObj) {
    $body = $BodyObj | ConvertTo-Json -Depth 10
  }
  $resp = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Url -Headers $headers -Body $body
  if ($resp.StatusCode -ge 400) {
    throw ("Request failed {0}: {1}" -f $resp.StatusCode, $resp.Content)
  }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
}

# Fetch the deal to derive the subject address key
$dealUrl = "{0}/rest/v1/deals?id=eq.{1}&select=id,org_id,address,city,state,zip" -f $SupabaseUrl, $DealId
$dealRows = Invoke-Json -Method "GET" -Url $dealUrl -BodyObj $null
if (-not $dealRows -or $dealRows.Count -eq 0) {
  Write-Host "FAIL: Deal not found or inaccessible (RLS)." -ForegroundColor Red
  exit 1
}
$deal = $dealRows[0]
if ($deal.org_id -ne $OrgId) {
  Write-Host ("WARN: Deal org_id ({0}) does not match expected OrgId ({1})." -f $deal.org_id, $OrgId) -ForegroundColor Yellow
}

$subjectKey = Normalize-AddressKey -Address $deal.address -City $deal.city -State $deal.state -Postal $deal.zip

# Run valuation
$valuationUrl = "$SupabaseUrl/functions/v1/v1-valuation-run"
$valuationBody = @{
  deal_id      = $DealId
  posture      = $PostureNormalized
  force_refresh = [bool]$ForceRefresh
  eval_tags    = @("self_comp_check")
}

Write-Host "Running valuation (force refresh: $ForceRefresh)..." -ForegroundColor Cyan
$valuationResp = Invoke-Json -Method "POST" -Url $valuationUrl -BodyObj $valuationBody
if (-not $valuationResp.ok) {
  Write-Host ("FAIL: valuation run failed: {0}" -f ($valuationResp.error ?? "unknown")) -ForegroundColor Red
  if ($valuationResp.message) { Write-Host $valuationResp.message }
  exit 1
}

$run = $valuationResp.valuation_run
$selectedComps = @()
if ($run.output.selected_comps) { $selectedComps = @($run.output.selected_comps) }
$selectedIds = @()
if ($run.output.selected_comp_ids) { $selectedIds = @($run.output.selected_comp_ids) }

$offenders = @()
foreach ($comp in $selectedComps) {
  $key = Normalize-CompKey -Comp $comp
  $compId = $comp.id
  $addresses = @($comp.address, $comp.address_line1, $comp.addressLine1, $comp.formattedAddress) | Where-Object { $_ }
  $displayAddress = ($addresses | Select-Object -First 1) ?? $compId
  $isSelf = $false
  if ($subjectKey -and $key -and $subjectKey -eq $key) { $isSelf = $true }
  if ($compId -and $compId -eq $DealId) { $isSelf = $true }
  if ($isSelf) {
    $offenders += [PSCustomObject]@{
      comp_id = $compId
      address = $displayAddress
      comp_kind = $comp.comp_kind
    }
  }
}

Write-Host ""
Write-Host "=== Selected comps ===" -ForegroundColor Cyan
if ($selectedComps.Count -eq 0) {
  Write-Host "No selected comps returned." -ForegroundColor Yellow
} else {
  $selectedComps | Select-Object @{n="comp_id";e={$_.id}}, @{n="kind";e={$_.comp_kind}}, @{n="address";e={$_.address ?? $_.formattedAddress ?? $_.addressLine1}} | Format-Table -AutoSize | Out-String | Write-Host
}

if ($offenders.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: Found comps matching subject property." -ForegroundColor Red
  $offenders | Format-Table -AutoSize | Out-String | Write-Host
  exit 1
}

Write-Host ""
Write-Host ("PASS: No self-comps detected. Selected_comp_ids={0}" -f ($selectedIds -join ", ")) -ForegroundColor Green
Write-Host ("valuation_run_id: {0}" -f $run.id)
