param(
  [Parameter(Mandatory = $true)]
  [string]$OrgId,
  [string]$PostureFilter = $null,
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

$Env = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $e = Read-EnvFile $p
  if ($e.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $e.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    $Env = $e
    break
  }
}

$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
if (-not $SupabaseUrl -and $Env -and $Env.ContainsKey("NEXT_PUBLIC_SUPABASE_URL")) {
  $SupabaseUrl = $Env["NEXT_PUBLIC_SUPABASE_URL"]
}
if (-not $SupabaseUrl) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL in env files or environment." -ForegroundColor Red
  exit 1
}
$SupabaseUrl = $SupabaseUrl.Trim().TrimEnd("/")

$AnonKey = Find-NextPublicAnonKey
if (-not $AnonKey) {
  Write-Host "FAIL: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in env files or environment." -ForegroundColor Red
  exit 1
}

function Acquire-CallerJwtFromPassword([string]$SupabaseUrl, [string]$EmailOverride, [string]$PasswordOverride) {
  $email = $EmailOverride
  $pwd = $PasswordOverride
  if (-not $email) { $email = $env:HPS_SMOKE_EMAIL }
  if (-not $pwd) { $pwd = $env:HPS_SMOKE_PASSWORD }
  if (-not $email -or -not $pwd) { return $null }
  $anonKey = $AnonKey
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

$ResolvedCallerJwt = Get-CallerJwt -SupabaseUrl $SupabaseUrl -CliSupplied $CallerJwt
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Set HPS_CALLER_JWT or SUPABASE_CALLER_JWT, or set HPS_SMOKE_EMAIL and HPS_SMOKE_PASSWORD for auto sign-in." -ForegroundColor Red
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

function Get-Json($url) {
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $url -Headers $headers
  if ($resp.StatusCode -ge 400) { throw "Request failed: $($resp.StatusCode) $url" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function Patch-Json($url, $bodyObj) {
  $json = $bodyObj | ConvertTo-Json -Depth 30 -Compress
  $resp = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $url -Headers $headers -Body $json
  if ($resp.StatusCode -ge 300) { throw "PATCH failed: $($resp.StatusCode) $url :: $json" }
}

function Print-State($policies) {
  Write-Host ""
  Write-Host "Policies state:" -ForegroundColor Cyan
  foreach ($p in $policies) {
    $mta = $p.policy_json?.valuation?.market_time_adjustment
    $enabled = Coalesce $mta?.enabled $false
    $minDays = $mta?.min_days_old
    Write-Host ("- posture={0} id={1} enabled={2} min_days_old={3}" -f $p.posture, $p.id, $enabled, (Coalesce $minDays "null"))
  }
}

Write-Host ("Supabase: {0}" -f $SupabaseUrl)
Write-Host ("Org: {0}" -f $OrgId)
if ($PostureFilter) { Write-Host ("Posture filter: {0}" -f $PostureFilter) }

$qs = "org_id=eq.$OrgId&is_active=eq.true"
if ($PostureFilter) { $qs = "$qs&posture=eq.$PostureFilter" }
$beforePolicies = Get-Json "$SupabaseUrl/rest/v1/policies?$qs"
if (-not $beforePolicies) {
  Write-Host "FAIL: No active policies found for org." -ForegroundColor Red
  exit 1
}

Print-State $beforePolicies

$updates = 0
foreach ($p in $beforePolicies) {
  $policyJson = $p.policy_json
  if (-not $policyJson) { $policyJson = @{} }
  if (-not $policyJson.valuation) { $policyJson.valuation = @{} }
  if (-not $policyJson.valuation.market_time_adjustment) { $policyJson.valuation.market_time_adjustment = @{} }
  $mta = $policyJson.valuation.market_time_adjustment
  $needUpdate = $false
  if (-not $mta.enabled -or $mta.enabled -ne $true) { $mta.enabled = $true; $needUpdate = $true }
  if ($mta.min_days_old -ne 90) { $mta.min_days_old = 90; $needUpdate = $true }
  $policyJson.valuation.market_time_adjustment = $mta

  if ($needUpdate) {
    Patch-Json "$SupabaseUrl/rest/v1/policies?id=eq.$($p.id)" @{ policy_json = $policyJson }
    $pvFilter = "org_id=eq.$OrgId&posture=eq.$($p.posture)"
    $pvBody = @{ policy_json = $policyJson }
    Patch-Json "$SupabaseUrl/rest/v1/policy_versions?$pvFilter" $pvBody
    $updates += 1
  }
}

$afterPolicies = Get-Json "$SupabaseUrl/rest/v1/policies?$qs"
Print-State $afterPolicies

Write-Host ""
if ($updates -gt 0) {
  Write-Host ("PASS: Updated {0} active policy rows (and matching policy_versions) with market_time_adjustment enabled= true, min_days_old=90." -f $updates) -ForegroundColor Green
} else {
  Write-Host "PASS: No changes needed; policies already had market_time_adjustment enabled with min_days_old=90." -ForegroundColor Green
}
