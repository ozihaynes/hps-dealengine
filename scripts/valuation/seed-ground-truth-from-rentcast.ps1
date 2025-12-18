param(
  [string]$OrgId = "033ff93d-ff97-4af9-b3a1-a114d3c04da6",
  [string]$ZipCode = "32828",
  [int]$SaleDateRangeDays = 180,
  [int]$Limit = 50,
  [int]$Offset = 0,
  [bool]$CreateDeals = $true,
  [string]$Source = "public_record_rentcast",
  [string]$PropertyType = "Single Family",
  [string]$CallerJwt = $null
)

$ErrorActionPreference = "Stop"

function Coalesce {
  param($Value, $Fallback)
  if ($null -ne $Value) { return $Value }
  return $Fallback
}

function Clamp-Int {
  param([int]$Value, [int]$Min, [int]$Max)
  if ($Value -lt $Min) { return $Min }
  if ($Value -gt $Max) { return $Max }
  return $Value
}

function Normalize-String {
  param($Value)
  if ($null -eq $Value) { return $null }
  $s = $Value.ToString().Trim()
  if ($s -eq "") { return $null }
  return $s
}

function Normalize-State {
  param($Value)
  $v = Normalize-String $Value
  if (-not $v) { return $null }
  return $v.ToUpper()
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

function Find-EnvValue {
  param([string]$Key, [string[]]$Paths)
  $envVal = [System.Environment]::GetEnvironmentVariable($Key, "Process")
  if ($envVal -and $envVal.Trim() -ne "") { return $envVal.Trim() }
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $lines = Get-Content $p
    foreach ($line in $lines) {
      if ($line -match ("^\s*{0}\s*=\s*(.+)$" -f [regex]::Escape($Key))) {
        $v = $Matches[1].Trim()
        if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
        if ($v) { return $v }
      }
    }
  }
  return $null
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

$EnvData = $null
foreach ($p in $envPaths) {
  if (-not (Test-Path $p)) { continue }
  $envCandidate = Read-EnvFile $p
  if ($envCandidate.ContainsKey("SUPABASE_URL") -and $envCandidate.ContainsKey("SUPABASE_ANON_KEY")) { $EnvData = $envCandidate; break }
  if ($envCandidate.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $envCandidate.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) { $EnvData = $envCandidate; break }
}

if (-not $EnvData) {
  Write-Host "FAIL: Missing env with SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and anon key." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = Coalesce $EnvData["SUPABASE_URL"] $EnvData["NEXT_PUBLIC_SUPABASE_URL"]
$ANON_KEY = Coalesce $EnvData["SUPABASE_ANON_KEY"] $EnvData["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

if (-not $SUPABASE_URL -or -not $ANON_KEY) {
  Write-Host "FAIL: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or anon key missing." -ForegroundColor Red
  exit 1
}

$SUPABASE_URL = $SUPABASE_URL.Trim().TrimEnd("/")
$RentcastApiKey = Find-EnvValue -Key "RENTCAST_API_KEY" -Paths $envPaths

if (-not $RentcastApiKey) {
  Write-Host "FAIL: RENTCAST_API_KEY not found in env or files." -ForegroundColor Red
  exit 1
}

function Invoke-PasswordGrant {
  param(
    [string]$Email,
    [string]$Password,
    [string]$SupabaseUrl,
    [string]$AnonKey
  )
  if (-not $Email -or -not $Password) { return $null }
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Depth 3
  $headers = @{ apikey = $AnonKey; "Content-Type" = "application/json"; Accept = "application/json" }
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("{0}/auth/v1/token?grant_type=password" -f $SupabaseUrl) -Headers $headers -Body $body
    $parsed = $resp.Content | ConvertFrom-Json
    if ($parsed.access_token) { return $parsed.access_token }
  } catch {
    return $null
  }
  return $null
}

function Find-CallerJwt {
  param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$CliSupplied,
    [string]$RepoRoot
  )

  $candidates = @()
  if ($env:HPS_CALLER_JWT) { $candidates += $env:HPS_CALLER_JWT }
  if ($env:SUPABASE_CALLER_JWT) { $candidates += $env:SUPABASE_CALLER_JWT }
  if ($CliSupplied) { $candidates += $CliSupplied }
  foreach ($c in $candidates) {
    if ($c -and $c.Trim() -ne "") { return $c.Trim() }
  }

  $credentialCandidates = New-Object System.Collections.ArrayList
  $seen = @{}
  function Add-CredCandidate {
    param([string]$Email, [string]$Password, [string]$Label)
    if (-not $Email -or -not $Password) { return }
    if ($seen.ContainsKey($Email)) { return }
    [void]$credentialCandidates.Add(@{ email = $Email; password = $Password; label = $Label })
    $seen[$Email] = $true
  }

  $resetScript = Join-Path $RepoRoot "scripts\reset-dev-auth-users.ts"
  if (Test-Path $resetScript) {
    $content = Get-Content -Path $resetScript -Raw
    $fallbacks = @(
      @{ email = "policy@hps.test.local"; password = "HpsDev!2025"; label = "policy" },
      @{ email = "manager@hps.test.local"; password = "HpsDev!2025"; label = "manager" },
      @{ email = "owner@hps.test.local"; password = "HpsDev!2025"; label = "owner" }
    ) | Where-Object { $content -match [regex]::Escape($_.email) -and $content -match [regex]::Escape($_.password) }
    foreach ($fb in $fallbacks) { Add-CredCandidate -Email $fb.email -Password $fb.password -Label $fb.label }
  }

  if ($env:HPS_SMOKE_EMAIL -and $env:HPS_SMOKE_PASSWORD) {
    Add-CredCandidate -Email $env:HPS_SMOKE_EMAIL -Password $env:HPS_SMOKE_PASSWORD -Label "env"
  }

  foreach ($cred in $credentialCandidates) {
    $token = Invoke-PasswordGrant -Email $cred.email -Password $cred.password -SupabaseUrl $SupabaseUrl -AnonKey $AnonKey
    if ($token) {
      Write-Host ("Caller JWT acquired via password grant ({0}, not printed)." -f $cred.label) -ForegroundColor Green
      return $token
    }
  }

  return $null
}

if (-not $OrgId) { Write-Host "FAIL: OrgId is required" -ForegroundColor Red; exit 1 }

$ResolvedCallerJwt = Find-CallerJwt -SupabaseUrl $SUPABASE_URL -AnonKey $ANON_KEY -CliSupplied $CallerJwt -RepoRoot $RepoRoot
if (-not $ResolvedCallerJwt) {
  Write-Host "FAIL: Caller JWT missing. Provide HPS_CALLER_JWT/SUPABASE_CALLER_JWT or HPS_SMOKE_EMAIL/HPS_SMOKE_PASSWORD; dev fallback requires reset-dev-auth-users.ts." -ForegroundColor Red
  exit 1
}
if ($ResolvedCallerJwt -notmatch '^[^.\s]+\.[^.\s]+\.[^.\s]+$') {
  Write-Host "FAIL: Caller JWT must be a Supabase Auth access token (JWT)." -ForegroundColor Red
  exit 1
}

$headers = @{
  apikey         = $ANON_KEY
  Authorization  = "Bearer $ResolvedCallerJwt"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

function Invoke-JsonGet {
  param([string]$Url)
  $resp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers $headers
  if ($resp.StatusCode -ge 400) { throw "Request failed: $($resp.StatusCode) $Url" }
  try { return $resp.Content | ConvertFrom-Json } catch { throw "Failed to parse JSON from $Url" }
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    $BodyObj,
    [hashtable]$CustomHeaders = $null
  )
  $json = $BodyObj | ConvertTo-Json -Depth 100 -Compress
  $hdrs = @{}
  $headers.Keys | ForEach-Object { $hdrs[$_] = $headers[$_] }
  if ($CustomHeaders) { $CustomHeaders.Keys | ForEach-Object { $hdrs[$_] = $CustomHeaders[$_] } }
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -Headers $hdrs -Body $json
  if ($resp.StatusCode -ge 300) { throw "POST failed: $($resp.StatusCode) $Url :: $json" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function Invoke-JsonPatch {
  param(
    [string]$Url,
    $BodyObj,
    [hashtable]$CustomHeaders = $null
  )
  $json = $BodyObj | ConvertTo-Json -Depth 100 -Compress
  $hdrs = @{}
  $headers.Keys | ForEach-Object { $hdrs[$_] = $headers[$_] }
  if ($CustomHeaders) { $CustomHeaders.Keys | ForEach-Object { $hdrs[$_] = $CustomHeaders[$_] } }
  $resp = Invoke-WebRequest -UseBasicParsing -Method Patch -Uri $Url -Headers $hdrs -Body $json
  if ($resp.StatusCode -ge 300) { throw "PATCH failed: $($resp.StatusCode) $Url :: $json" }
  try { return $resp.Content | ConvertFrom-Json } catch { return $null }
}

function Resolve-Price {
  param($Obj)
  $candidates = @(
    $Obj.lastSalePrice,
    $Obj.lastSoldPrice,
    $Obj.last_sale_price,
    $Obj.salePrice,
    $Obj.sale_price,
    $Obj.price
  )
  foreach ($c in $candidates) {
    if ($null -eq $c) { continue }
    $tmp = $null
    if ([decimal]::TryParse($c.ToString(), [ref]$tmp)) { return [decimal]$tmp }
  }
  return $null
}

function Resolve-Date {
  param($Obj)
  $candidates = @(
    $Obj.lastSaleDate,
    $Obj.lastSoldDate,
    $Obj.last_sale_date,
    $Obj.saleDate,
    $Obj.sale_date,
    $Obj.closeDate,
    $Obj.close_date
  )
  foreach ($c in $candidates) {
    $v = Normalize-String $c
    if ($v) { return $v }
  }
  return $null
}

function Try-ParseDateValue {
  param([string]$Value)
  if (-not $Value) { return $null }
  try {
    return [datetime]::Parse($Value, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
  } catch {
    try { return [datetime]::Parse($Value) } catch { return $null }
  }
}

function Resolve-AddressLine {
  param($Obj)
  $candidates = @(
    $Obj.formattedAddress,
    $Obj.addressLine1,
    $Obj.address
  )
  foreach ($c in $candidates) {
    $v = Normalize-String $c
    if ($v) { return $v }
  }
  return $null
}

function Escape-Value {
  param([string]$Value)
  return [uri]::EscapeDataString($Value)
}

$Limit = Clamp-Int $Limit 1 200
$Offset = [math]::Max(0, [int]$Offset)
$SaleDateRangeDays = [math]::Max(1, [int]$SaleDateRangeDays)

Write-Host ("Supabase: {0}" -f $SUPABASE_URL)
Write-Host ("Org: {0}" -f $OrgId)
Write-Host ("Zip: {0} | SaleDateRangeDays: {1} | Limit: {2} | Offset: {3} | CreateDeals: {4}" -f $ZipCode, $SaleDateRangeDays, $Limit, $Offset, $CreateDeals)
Write-Host ("Source: {0}" -f $Source)

$propertyTypeEscaped = [uri]::EscapeDataString($PropertyType)
$rentcastUrl = "https://api.rentcast.io/v1/properties?zipCode=$($ZipCode)&saleDateRange=*:$SaleDateRangeDays&limit=$Limit&offset=$Offset&propertyType=$propertyTypeEscaped"
$rentHeaders = @{ Accept = "application/json"; "X-Api-Key" = $RentcastApiKey }

$rentResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $rentcastUrl -Headers $rentHeaders
if ($rentResp.StatusCode -ge 300) {
  Write-Host ("FAIL: RentCast request failed with status {0}" -f $rentResp.StatusCode) -ForegroundColor Red
  Write-Host $rentResp.Content
  exit 1
}

$rentPayload = $null
try { $rentPayload = $rentResp.Content | ConvertFrom-Json } catch { $rentPayload = $null }
if (-not $rentPayload) {
  Write-Host "FAIL: Unable to parse RentCast response JSON." -ForegroundColor Red
  exit 1
}

$rentList = @()
if ($rentPayload -is [System.Collections.IEnumerable] -and -not ($rentPayload -is [string])) {
  foreach ($item in $rentPayload) { $rentList += ,$item }
} else {
  $rentList += $rentPayload
}

$candidates = @()
foreach ($rec in $rentList) {
  $price = Resolve-Price $rec
  $dateRaw = Resolve-Date $rec
  $dateParsed = Try-ParseDateValue $dateRaw
  if (-not $price -or -not $dateParsed) { continue }

  $addr = Resolve-AddressLine $rec
  $city = Normalize-String $rec.city
  $state = Normalize-State $rec.state
  $zip = Normalize-String (Coalesce $rec.zipCode (Coalesce $rec.zipcode $rec.zip))
  $addressSort = Coalesce $addr (Coalesce $rec.formattedAddress "")

  $candidates += [pscustomobject]@{
    address        = $addr
    city           = $city
    state          = $state
    zip            = $zip
    realized_price = [decimal]$price
    realized_date  = $dateParsed.ToString("yyyy-MM-dd")
    sort_date      = $dateParsed
    sort_price     = [double]$price
    address_sort   = $addressSort
    raw            = $rec
  }
}

if ($candidates.Count -eq 0) {
  Write-Host "No RentCast closed sales with both lastSalePrice and lastSaleDate found." -ForegroundColor Yellow
  exit 0
}

$ranked = $candidates | Sort-Object `
  @{ Expression = { $_.sort_date }; Descending = $true }, `
  @{ Expression = { $_.sort_price }; Descending = $true }, `
  @{ Expression = { $_.address_sort }; Descending = $false } | Select-Object -First $Limit

Write-Host ("RentCast returned {0} candidates; using top {1} after filter/sort." -f $candidates.Count, $ranked.Count)

function Build-Note {
  param([int]$Days, [string]$Zip)
  return ("rentcast lastSalePrice/lastSaleDate; zip={0}; saleDateRangeDays={1}" -f $Zip, $Days)
}

function Merge-Notes {
  param([string]$Existing, [string]$NewNote)
  if (-not $Existing -or $Existing.Trim() -eq "") { return $NewNote }
  if ($Existing -like "*$NewNote*") { return $Existing }
  return ("{0} | {1}" -f $Existing.Trim(), $NewNote)
}

function Find-Deal {
  param($Item)
  $filters = @("org_id=eq.$OrgId")
  if ($Item.address) { $filters += ("address=ilike.{0}" -f (Escape-Value $Item.address)) }
  if ($Item.city) { $filters += ("city=ilike.{0}" -f (Escape-Value $Item.city)) }
  if ($Item.state) { $filters += ("state=eq.{0}" -f (Escape-Value $Item.state)) }
  if ($Item.zip) { $filters += ("zip=eq.{0}" -f (Escape-Value $Item.zip)) }
  $qs = ($filters -join "&") + "&order=created_at.asc&limit=1"
  $url = "$SUPABASE_URL/rest/v1/deals?$qs"
  $rows = Invoke-JsonGet $url
  if ($rows -and $rows.Count -gt 0) { return $rows[0] }
  return $null
}

function Ensure-Deal {
  param($Item, [bool]$AllowCreate)
  $existing = Find-Deal $Item
  if ($existing) { return @{ id = $existing.id; created = $false } }
  if (-not $AllowCreate) { return @{ id = $null; created = $false } }
  if (-not $Item.address) { return @{ id = $null; created = $false } }

  $body = @(
    @{
      org_id  = $OrgId
      address = $Item.address
      city    = $Item.city
      state   = $Item.state
      zip     = $Item.zip
      payload = @{}
    }
  )
  $resp = Invoke-JsonPost "$SUPABASE_URL/rest/v1/deals" $body @{ Prefer = "return=representation" }
  if ($resp -and $resp.Count -gt 0 -and $resp[0].id) {
    return @{ id = $resp[0].id; created = $true }
  }
  return @{ id = $null; created = $false }
}

function Get-GroundTruthRow {
  param([string]$SubjectKey, [string]$RealizedDate)
  $filters = @(
    "org_id=eq.$OrgId",
    "subject_key=eq.$(Escape-Value $SubjectKey)",
    "source=eq.$(Escape-Value $Source)",
    "realized_date=eq.$RealizedDate",
    "limit=1"
  )
  $url = "$SUPABASE_URL/rest/v1/valuation_ground_truth?" + ($filters -join "&")
  $rows = Invoke-JsonGet $url
  if ($rows -and $rows.Count -gt 0) { return $rows[0] }
  return $null
}

function Upsert-GroundTruth {
  param(
    [string]$DealId,
    $Item,
    [string]$Note
  )

  $subjectKey = "deal:$DealId"
  $existing = Get-GroundTruthRow -SubjectKey $subjectKey -RealizedDate $Item.realized_date
  $rawPayload = @{
    rentcast = $Item.raw
    meta     = @{
      zip                 = $ZipCode
      saleDateRangeDays   = $SaleDateRangeDays
      limit               = $Limit
      offset              = $Offset
      propertyType        = $PropertyType
      source              = $Source
    }
  }

  if ($existing) {
    $notesMerged = Merge-Notes $existing.notes $Note
    $patchBody = @{
      realized_price = $Item.realized_price
      notes          = $notesMerged
      deal_id        = $DealId
      raw            = $rawPayload
    }
    $null = Invoke-JsonPatch "$SUPABASE_URL/rest/v1/valuation_ground_truth?org_id=eq.$OrgId&subject_key=eq.$(Escape-Value $subjectKey)&source=eq.$(Escape-Value $Source)&realized_date=eq.$($Item.realized_date)" $patchBody @{ Prefer = "return=representation" }
    return @{ upserted = $true; notes = $notesMerged; existing = $true }
  }

  $insertBody = @(
    @{
      org_id         = $OrgId
      deal_id        = $DealId
      subject_key    = $subjectKey
      source         = $Source
      realized_price = $Item.realized_price
      realized_date  = $Item.realized_date
      notes          = $Note
      raw            = $rawPayload
    }
  )
  $null = Invoke-JsonPost "$SUPABASE_URL/rest/v1/valuation_ground_truth?on_conflict=org_id,subject_key,source,realized_date" $insertBody @{ Prefer = "resolution=merge-duplicates,return=representation" }
  return @{ upserted = $true; notes = $Note; existing = $false }
}

$rowsOut = @()
$createdDeals = 0
$gtUpserts = 0
$skippedNoDeal = 0
$noteBase = Build-Note -Days $SaleDateRangeDays -Zip $ZipCode

foreach ($item in $ranked) {
  $dealOutcome = $null
  if ($CreateDeals) {
    $dealOutcome = Ensure-Deal -Item $item -AllowCreate:$true
  } else {
    $dealOutcome = Ensure-Deal -Item $item -AllowCreate:$false
  }

  $dealId = $dealOutcome.id
  $created = $dealOutcome.created
  $upserted = $false
  $noteUsed = $noteBase

  if ($dealId) {
    if ($created) { $createdDeals += 1 }
    $gt = Upsert-GroundTruth -DealId $dealId -Item $item -Note $noteBase
    if ($gt.upserted) {
      $gtUpserts += 1
      $upserted = $true
      $noteUsed = $gt.notes
    }
  } else {
    $skippedNoDeal += 1
  }

  $rowsOut += [pscustomobject]@{
    deal_id        = Coalesce $dealId "-"
    address        = Coalesce $item.address "-"
    realized_price = $item.realized_price
    realized_date  = $item.realized_date
    created_deal   = [bool]$created
    upserted_gt    = [bool]$upserted
    notes          = $noteUsed
  }
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
$rowsOut | Format-Table | Out-String | Write-Host

Write-Host ""
Write-Host ("Summary: deals_created={0}, gt_upserts={1}, rows={2}, skipped_no_deal={3}" -f $createdDeals, $gtUpserts, $rowsOut.Count, $skippedNoDeal) -ForegroundColor Cyan

if (-not $CreateDeals) {
  Write-Host "CreateDeals=false: rows without existing deals were skipped for DB writes; create deals manually and rerun if needed." -ForegroundColor Yellow
}

Write-Host "Done." -ForegroundColor Green
