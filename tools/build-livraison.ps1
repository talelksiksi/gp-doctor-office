# Prépare le dossier à copier sur le PC du cabinet : livraison\Mon Cabinet (+ un .zip)
# Contient les VRAIES données patients : ne jamais publier ce dossier.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'livraison\Mon Cabinet'
$nodeZip = Get-ChildItem (Join-Path $root 'tools\dl') -Filter 'node-v*-win-x64.zip' | Sort-Object Name -Descending | Select-Object -First 1
if (-not $nodeZip) { throw 'Node.js introuvable dans tools\dl' }

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force "$out\runtime", "$out\data\sauvegardes" | Out-Null

# Application et serveur
Copy-Item (Join-Path $root 'app') "$out\app" -Recurse
Copy-Item (Join-Path $root 'serveur.js') $out
Copy-Item (Join-Path $root 'Mon Cabinet.vbs') $out

# Scripts Windows : fins de ligne CRLF ; PowerShell avec BOM (accents) ; VBS en ANSI
$utf8Bom = New-Object System.Text.UTF8Encoding $true
$ansi = [System.Text.Encoding]::GetEncoding(1252)
function Copy-Text($name, $enc) {
  $t = [IO.File]::ReadAllText((Join-Path $root $name)) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText((Join-Path $out $name), $t, $enc)
}
Copy-Text 'Installer.bat' (New-Object System.Text.UTF8Encoding $false)
Copy-Text 'Ouvrir Mon Cabinet.bat' (New-Object System.Text.UTF8Encoding $false)
Copy-Text 'installer.ps1' $utf8Bom
Copy-Text 'Mon Cabinet.vbs' $ansi

# Node.js portable : seul node.exe est nécessaire
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($nodeZip.FullName)
$entry = $zip.Entries | Where-Object { $_.FullName -match '/node\.exe$' } | Select-Object -First 1
[IO.Compression.ZipFileExtensions]::ExtractToFile($entry, "$out\runtime\node.exe", $true)
$zip.Dispose()

# Données importées de MedERP
Copy-Item (Join-Path $root 'data\donnees.json') "$out\data\donnees.json"

# Mode d'emploi
$lisez = @"
MON CABINET — mode d'emploi
===========================

INSTALLATION (une seule fois)
  1. Copier tout le dossier « Mon Cabinet » dans C:\ (par exemple C:\Mon Cabinet).
  2. Double-cliquer sur « Installer.bat ».
  3. L'icône « Mon Cabinet » apparaît sur le bureau.

UTILISATION
  - Double-cliquer sur l'icône « Mon Cabinet » du bureau.
  - Taper le code à 4 chiffres.
  - Pour agrandir le texte : boutons A+ / A- en haut à droite.
  - Pour imprimer une ordonnance : bouton « Enregistrer et imprimer ».

SAUVEGARDES
  Une copie de toutes les données est faite chaque jour dans data\sauvegardes
  (les 90 derniers jours sont gardés). Pour plus de sécurité, copier de temps en
  temps le dossier « data » sur une clé USB.

EN CAS DE PROBLÈME
  Double-cliquer sur « Ouvrir Mon Cabinet.bat » : une fenêtre noire affiche ce qui se passe.
  Appeler Talel.

Ce dossier contient les dossiers médicaux des patients : ne pas l'envoyer par e-mail
ni le mettre sur Internet.

Conçu et développé par CICTNA RDC.
"@
[IO.File]::WriteAllText("$out\LISEZ-MOI.txt", ($lisez -replace "`r?`n", "`r`n"), $utf8Bom)

# Archive pour le transport (clé USB)
$zipOut = Join-Path $root 'livraison\Mon Cabinet.zip'
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
[IO.Compression.ZipFile]::CreateFromDirectory($out, $zipOut, 'Optimal', $true)

$size = (Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
"Dossier prêt : $out ({0:N1} Mo)" -f $size
"Archive     : $zipOut ({0:N1} Mo)" -f ((Get-Item $zipOut).Length / 1MB)
