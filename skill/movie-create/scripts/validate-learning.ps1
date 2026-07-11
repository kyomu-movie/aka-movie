param([string]$RepoRoot = (Get-Location).Path)

$required = @("reference", "leran_rule\approved", "leran_rule\candidates", "leran_rule\successes")
$missing = $required | Where-Object { -not (Test-Path (Join-Path $RepoRoot $_)) }
if ($missing) { throw "Missing required folders: $($missing -join ', ')" }

$rules = Get-ChildItem -Path (Join-Path $RepoRoot "leran_rule\approved") -Filter *.md -File
if (-not $rules) { throw "No approved rules found. Restore base-style.md." }

$empty = $rules | Where-Object { $_.Length -eq 0 }
if ($empty) { throw "Empty approved rules: $($empty.Name -join ', ')" }

Write-Host "Shared learning data is valid. Approved rules: $($rules.Count)"
