$envFile = Join-Path -Path (Get-Location) -ChildPath ".env.qa"

if (-not (Test-Path $envFile)) {
  Write-Error ".env.qa not found. Run scripts/seed-qa.ts first."
  exit 1
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
    return
  }

  $parts = $line -split "=", 2
  if ($parts.Length -ne 2) {
    return
  }

  $name = $parts[0].Trim()
  $value = $parts[1]

  Set-Item -Path "Env:$name" -Value $value
  Write-Output "Set $name"
}
