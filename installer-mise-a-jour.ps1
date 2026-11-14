# Met à jour « Mon Cabinet » déjà installé : remplace le programme, ne touche JAMAIS aux données des patients.
param([string]$Cible = 'C:\Mon Cabinet')
$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $Cible 'serveur.js'))) {
  Write-Host "  Mon Cabinet n'a pas été trouvé dans $Cible." -ForegroundColor Red
  $Cible = Read-Host '  Tapez le dossier où il est installé (ex : D:\Mon Cabinet)'
  if (-not (Test-Path (Join-Path $Cible 'serveur.js'))) { throw "Dossier introuvable : $Cible" }
}
# 1. Arrêter le programme s'il tourne (pour pouvoir le remplacer)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ExecutablePath -like "$Cible*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Milliseconds 800
# 2. Copie de sécurité des données avant toute chose
$data = Join-Path $Cible 'data'
$stamp = Get-Date -Format 'yyyy-MM-dd-HH\hmm'
New-Item -ItemType Directory -Force (Join-Path $data 'sauvegardes') | Out-Null
if (Test-Path (Join-Path $data 'donnees.json')) { Copy-Item (Join-Path $data 'donnees.json') (Join-Path $data "sauvegardes\donnees-avant-mise-a-jour-$stamp.json") }
# 3. Remplacer le programme (app et serveur), rien d'autre
Remove-Item (Join-Path $Cible 'app') -Recurse -Force
Copy-Item (Join-Path $source 'app') (Join-Path $Cible 'app') -Recurse
Copy-Item (Join-Path $source 'serveur.js') $Cible -Force
# 4. Réglages de l'en-tête : ajoutés au démarrage seulement s'ils manquent
$init = Join-Path $source 'reglages-initiaux.json'
if (Test-Path $init) { Copy-Item $init (Join-Path $data 'reglages-initiaux.json') -Force }
Write-Host ''
Write-Host '  Mise à jour terminée. Les dossiers des patients n''ont pas été modifiés.' -ForegroundColor Green
Write-Host "  (Copie de sécurité : data\sauvegardes\donnees-avant-mise-a-jour-$stamp.json)"
# 5. Relancer
Start-Process (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $Cible 'Mon Cabinet.vbs') + '"')
