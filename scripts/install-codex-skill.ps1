param(
  [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" })
)

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repositoryRoot "skill\movie-create"
$destination = Join-Path $CodexHome "skills\movie-create"
if (-not (Test-Path $source)) { throw "Shared skill was not found: $source" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse -Force
Write-Host "Installed Codex skill: $destination"
Write-Host "Restart Codex, then invoke `$movie-create`."
