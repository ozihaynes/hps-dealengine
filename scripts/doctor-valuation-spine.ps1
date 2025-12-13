$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..") | Select-Object -ExpandProperty Path

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

$headers = @{ apikey = $ANON_KEY; Authorization = "Bearer $ANON_KEY"; Accept = "application/json" }

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

if ($okTables -and $okFns) {
  Write-Host "PASS: Valuation Spine doctor OK" -ForegroundColor Green
  exit 0
}

Write-Host "FAIL: Issues detected. Fix FAIL lines above, then rerun pnpm doctor:valuation" -ForegroundColor Red
exit 1