# Prépare livraison\Mise a jour Mon Cabinet (+ .zip) : programme seul, sans aucune donnée patient.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'livraison\Mise a jour Mon Cabinet'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item (Join-Path $root 'app') "$out\app" -Recurse
Copy-Item (Join-Path $root 'serveur.js') $out
$init = Join-Path $root 'data\reglages-initiaux.modele.json'
if (Test-Path $init) { Copy-Item $init "$out\reglages-initiaux.json" }
$bom = New-Object System.Text.UTF8Encoding $true
$ps = [IO.File]::ReadAllText((Join-Path $root 'installer-mise-a-jour.ps1')) -replace "`r?`n", "`r`n"
[IO.File]::WriteAllText("$out\installer-mise-a-jour.ps1", $ps, $bom)
$bat = "@echo off`r`nchcp 65001 >nul`r`ntitle Mise a jour de Mon Cabinet`r`ncd /d `"%~dp0`"`r`necho.`r`necho   Mise a jour de Mon Cabinet...`r`necho.`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0installer-mise-a-jour.ps1`"`r`necho.`r`npause`r`n"
[IO.File]::WriteAllText("$out\Installer la mise a jour.bat", $bat, (New-Object System.Text.UTF8Encoding $false))
$zip = Join-Path $root 'livraison\Mise a jour Mon Cabinet.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($out, $zip, 'Optimal', $true)
Get-ChildItem $out -Recurse -File | ForEach-Object { $_.FullName.Replace("$out\", '') }
'Archive : {0} ({1:N0} Ko)' -f $zip, ((Get-Item $zip).Length / 1KB)
