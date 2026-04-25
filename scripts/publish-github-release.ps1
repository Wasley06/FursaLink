param(
  [string]$Repo = "",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

function Get-PackageVersion {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  return $pkg.version
}

if (-not $Version) { $Version = Get-PackageVersion }
if (-not $Repo) { $Repo = "Wasley-Dev/fursalink-zanzibar" }

$tag = "v$Version"

Write-Host "Publishing $tag to $Repo"

if (-not (Test-Path "release/latest.yml")) {
  throw "Missing release/latest.yml. Run: npm.cmd run desktop:dist"
}

$assets = @(
  "release/latest.yml",
  "release/*Setup*$Version*.exe",
  "release/*Setup*$Version*.exe.blockmap"
)

& gh release view $tag --repo $Repo *> $null 2>&1
$exists = $LASTEXITCODE -eq 0
if (-not $exists) {
  Write-Host "Creating release $tag (draft)..."
  & gh release create $tag --repo $Repo --title $tag --notes "Auto-update release for desktop installers." --draft
}

Write-Host "Uploading assets..."
& gh release upload $tag $assets --repo $Repo --clobber

Write-Host "Publishing release..."
& gh release edit $tag --repo $Repo --draft=false --latest

Write-Host "Done."
