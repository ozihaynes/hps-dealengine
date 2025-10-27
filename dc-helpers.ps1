function Invoke-DCObject {
param(
[int]$PORT = 3000,
[double]$ab_price,
[double]$bc_price,
[ValidateSet("MIAMI-DADE","OTHER")][string]$county = "OTHER",
[ValidateSet("SFR","OTHER")][string]$property_type = "SFR",
[int]$hold_days = 0,
[double]$monthly_carry = 0,
[double]$ab_note_amount = 0,
[double]$bc_note_amount = 0,
[int]$ab_pages = 1,
[int]$bc_pages = 1
)
$body = @{
ab_price       = $ab_price
bc_price       = $bc_price
county         = $county
property_type  = $property_type
hold_days      = $hold_days
monthly_carry  = $monthly_carry
ab_note_amount = $ab_note_amount
bc_note_amount = $bc_note_amount
ab_pages       = $ab_pages
bc_pages       = $bc_pages
}
$json = $body | ConvertTo-Json -Compress
Invoke-RestMethod -Uri ("http://localhost:{0}/api/double-close" -f $PORT) -Method POST -Body $json -ContentType 'application/json'
}

function Invoke-UWObject {
param(
[int]$PORT = 3000,
[hashtable]$Deal = @{ },
[hashtable]$Policy = @{ }
)
$body = @{ deal = $Deal; policy = $Policy }
$json = $body | ConvertTo-Json -Compress
Invoke-RestMethod -Uri ("http://localhost:{0}/api/underwrite" -f $PORT) -Method POST -Body $json -ContentType 'application/json'
}

function Show-DC {
param(
[Parameter(Mandatory)][double]$ab_price,
[Parameter(Mandatory)][double]$bc_price,
[ValidateSet("MIAMI-DADE","OTHER")][string]$county = "OTHER",
[ValidateSet("SFR","OTHER")][string]$property_type = "SFR",
[int]$hold_days = 0,
[double]$monthly_carry = 0,
[double]$ab_note_amount = 0,
[double]$bc_note_amount = 0,
[int]$ab_pages = 1,
[int]$bc_pages = 1,
[int]$PORT = 3000
)
$r = Invoke-DCObject -PORT $PORT -ab_price $ab_price -bc_price $bc_price -county $county -property_type $property_type -hold_days $hold_days -monthly_carry $monthly_carry -ab_note_amount $ab_note_amount -bc_note_amount $bc_note_amount -ab_pages $ab_pages -bc_pages $bc_pages
[pscustomobject]@{
county        = $county
prop          = $property_type
ab_price      = [double]$ab_price
bc_price      = [double]$bc_price
hold_days     = [int]$hold_days
monthly_carry = [double]$monthly_carry
ab_deed       = $r.data.side_ab.deed_stamps
ab_title      = $r.data.side_ab.title_premium
ab_record     = $r.data.side_ab.recording_fees
bc_deed       = $r.data.side_bc.deed_stamps
bc_title      = $r.data.side_bc.title_premium
bc_record     = $r.data.side_bc.recording_fees
total_costs   = $r.data.dc_total_costs
carry_cost    = $r.data.dc_carry_cost
spread        = $r.data.dc_net_spread
comparison    = $r.data.comparison
}
}

function Assert-Approx {
param([double]$Actual, [double]$Expected, [double]$Tolerance = 0.01, [string]$Label = "value")
if ([math]::Abs($Actual - $Expected) -gt $Tolerance) {
throw "Assert-Approx failed for $Label. Actual=$Actual Expected=$Expected ±$Tolerance"
}
}

function Assert-DC {
param(
[double]$ab_price, [double]$bc_price,
[string]$county = "OTHER", [string]$property_type = "SFR",
[int]$hold_days = 0, [double]$monthly_carry = 0,
[double]$expect_spread, [double]$expect_total_costs,
[int]$PORT = 3000
)
$r = Invoke-DCObject -PORT $PORT -ab_price $ab_price -bc_price $bc_price -county $county -property_type $property_type -hold_days $hold_days -monthly_carry $monthly_carry
Assert-Approx -Actual $r.data.dc_net_spread -Expected $expect_spread -Label "dc_net_spread"
Assert-Approx -Actual $r.data.dc_total_costs -Expected $expect_total_costs -Label "dc_total_costs"
"OK: spread=$($r.data.dc_net_spread) costs=$($r.data.dc_total_costs)"
}



