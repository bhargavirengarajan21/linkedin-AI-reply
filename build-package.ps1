# Builds a clean, store-ready zip of the extension.
# Uses an ALLOW-LIST: only the files named here are packaged, so a private file
# (like your real config.local.js) can never leak into the zip by accident.
# config.local.js is always replaced with an empty stub in the package.
#
# Run from the extension folder:   .\build-package.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- files that make up the shipped extension (relative paths) ---
$include = @(
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'defaults.js',
  'templates.js',
  'profile.js',
  'options.html',
  'options.js',
  'config.local.example.js',
  'index.html',
  'README.md',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'nativehost/host.js',
  'nativehost/host.bat',
  'nativehost/install.bat',
  'nativehost/uninstall.bat'
)
# NOT packaged: config.local.js (private), nativehost/manifest.json (generated per-machine
# by install.bat), nativehost-private-key.pem (private), bridge/ (replaced by native messaging),
# .gitignore, build-package.ps1, dist/ — none are part of the shipped extension.

# --- staging dir ---
$stage = Join-Path $root 'dist/_stage'
$dist  = Join-Path $root 'dist'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# --- copy allow-listed files, preserving folder structure ---
$missing = @()
foreach ($rel in $include) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) { $missing += $rel; continue }
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
  Copy-Item $src $dest
}
if ($missing.Count -gt 0) {
  Write-Warning ("Skipped missing files: {0}" -f ($missing -join ', '))
}

# --- strip the dev-only "key" from the uploaded manifest ---
# The "key" pins a stable ID for the UNPACKED build (needed by the native host).
# The Chrome Web Store assigns and manages the published ID itself, so remove it.
$mfPath = Join-Path $stage 'manifest.json'
$mf = Get-Content $mfPath -Raw
$mf = $mf -replace '(?m)^\s*"key":\s*"[^"]*",\r?\n', ''
Set-Content -Path $mfPath -Value $mf -NoNewline -Encoding utf8

# --- write an EMPTY config.local.js stub (never the real one) ---
$stub = "// Empty stub shipped with the public build. Users add their own details`r`n" +
        "// via the Settings page, or by creating their own config.local.js.`r`n" +
        "const LIAI_LOCAL_CONFIG = {};`r`n"
Set-Content -Path (Join-Path $stage 'config.local.js') -Value $stub -NoNewline -Encoding utf8

# --- safety check: the staged config.local.js must be the empty stub ---
$staged = Get-Content (Join-Path $stage 'config.local.js') -Raw
if ($staged -match 'emailPersonal|@gmail|LIAI_LOCAL_CONFIG\s*=\s*\{[^}]*\w') {
  throw "Aborting: staged config.local.js is not the empty stub. Build cancelled to protect your data."
}

# --- version from manifest ---
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$zip = Join-Path $dist ("linkedin-ai-reply-v{0}.zip" -f $version)
if (Test-Path $zip) { Remove-Item $zip -Force }

# --- zip the CONTENTS of the stage dir (not the stage folder itself) ---
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host ("Built {0} ({1} KB)" -f $zip, $size) -ForegroundColor Green
Write-Host "Packaged files:" -ForegroundColor Cyan
$include + 'config.local.js (empty stub)' | ForEach-Object { Write-Host "  $_" }
