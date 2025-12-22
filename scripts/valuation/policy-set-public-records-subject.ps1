param(
  [Parameter(Mandatory = $true)]
  [string]$OrgId,
  [string]$PostureFilter = $null,
  [Alias("SupabaseAccessToken")]
  [string]$CallerJwt = $null
)

$ErrorActionPreference = "Stop"

function Coalesce($value, $fallback) {
  if ($null -ne $value) { return $value }
  return $fallback
}

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
  if (-not $anonKey) { return $null }
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
  } catch {}
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

  return $null
}

if (-not $Env) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env files." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = $Env["NEXT_PUBLIC_SUPABASE_URL"].Trim()
$ANON_KEY = $Env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].Trim()

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SUPABASE_URL -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
  exit 1
}

if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: HPS_CALLER_JWT must be a Supabase Auth user access token (JWT)." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey        = $ANON_KEY
  Authorization = "Bearer $ResolvedCallerJwt"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

Write-Host ("Target Supabase URL: {0}" -f $SUPABASE_URL)
Write-Host ("Org: {0}" -f $OrgId)

# Fetch active policies
$policySelect = "id,org_id,posture,policy_json"
$policyUrl = "{0}/rest/v1/policies?org_id=eq.{1}&is_active=eq.true&select={2}" -f $SUPABASE_URL, $OrgId, [uri]::EscapeDataString($policySelect)
if ($PostureFilter) {
  $policyUrl += ("&posture=eq.{0}" -f $PostureFilter)
}
$policyResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $policyUrl -Headers $headers
$policies = $policyResp.Content | ConvertFrom-Json

if (-not $policies) {
  Write-Host "No active policies found for org/posture filter." -ForegroundColor Yellow
  exit 0
}

$targetObj = @{
  enabled = $true
  provider = "attom"
  prefer_over_rentcast_subject = $true
}

foreach ($p in $policies) {
  Write-Host ("Before policy {0} posture {1}: {2}" -f $p.id, $p.posture, ($p.policy_json.valuation.public_records_subject | ConvertTo-Json -Compress)) -ForegroundColor Yellow
  if (-not $p.policy_json.valuation) { $p.policy_json | Add-Member -NotePropertyName valuation -NotePropertyValue @{} }
  if (-not $p.policy_json.valuation.public_records_subject) { $p.policy_json.valuation.public_records_subject = @{} }
  foreach ($k in $targetObj.Keys) { $p.policy_json.valuation.public_records_subject[$k] = $targetObj[$k] }
  $body = @{ policy_json = $p.policy_json } | ConvertTo-Json -Depth 6
  $updateUrl = "{0}/rest/v1/policies?id=eq.{1}" -f $SUPABASE_URL, $p.id
  Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $updateUrl -Headers $headers -Body $body | Out-Null
  Write-Host ("After policy  {0} posture {1}: {2}" -f $p.id, $p.posture, ($p.policy_json.valuation.public_records_subject | ConvertTo-Json -Compress)) -ForegroundColor Green

  # Update matching policy_versions
  $pvUrl = "{0}/rest/v1/policy_versions?org_id=eq.{1}&posture=eq.{2}&select={3}" -f $SUPABASE_URL, $OrgId, $p.posture, [uri]::EscapeDataString($policySelect)
  $pvResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $pvUrl -Headers $headers
  $pvs = $pvResp.Content | ConvertFrom-Json
  foreach ($pv in $pvs) {
    if (-not $pv.policy_json.valuation) { $pv.policy_json | Add-Member -NotePropertyName valuation -NotePropertyValue @{} }
    if (-not $pv.policy_json.valuation.public_records_subject) { $pv.policy_json.valuation.public_records_subject = @{} }
    foreach ($k in $targetObj.Keys) { $pv.policy_json.valuation.public_records_subject[$k] = $targetObj[$k] }
    $pvBody = @{ policy_json = $pv.policy_json } | ConvertTo-Json -Depth 6
    $pvUpdateUrl = "{0}/rest/v1/policy_versions?id=eq.{1}" -f $SUPABASE_URL, $pv.id
    Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $pvUpdateUrl -Headers $headers -Body $pvBody | Out-Null
    Write-Host ("Updated policy_version {0} posture {1}" -f $pv.id, $p.posture) -ForegroundColor Cyan
  }
}

Write-Host "Done patching public_records_subject." -ForegroundColor Green
