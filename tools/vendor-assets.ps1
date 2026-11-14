# Télécharge une fois les polices et les icônes dans app/vendor pour que l'application marche sans Internet.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root 'app\vendor'
if (Test-Path $vendor) { Remove-Item $vendor -Recurse -Force }
New-Item -ItemType Directory -Force "$vendor\fonts", "$vendor\fontawesome\css", "$vendor\fontawesome\webfonts" | Out-Null
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

# 1. Polices Google (seulement latin, latin-ext et arabe)
$families = 'family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Archivo:wght@600;700&family=Amiri:wght@400;700&family=Tinos:wght@400;700&family=Dancing+Script:wght@600&display=swap'
$css = (Invoke-WebRequest "https://fonts.googleapis.com/css2?$families" -UserAgent $ua -UseBasicParsing).Content
$keep = @('latin', 'latin-ext', 'arabic')
$blocks = [regex]::Matches($css, '/\*\s*([a-z\-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})')
$outCss = New-Object System.Text.StringBuilder
$n = 0
foreach ($b in $blocks) {
  if ($keep -notcontains $b.Groups[1].Value) { continue }
  $face = $b.Groups[2].Value
  $url = [regex]::Match($face, 'url\((https://[^)]+\.woff2)\)').Groups[1].Value
  $fam = [regex]::Match($face, "font-family:\s*'([^']+)'").Groups[1].Value -replace '\s', ''
  $w = [regex]::Match($face, 'font-weight:\s*(\d+)').Groups[1].Value
  $st = [regex]::Match($face, 'font-style:\s*(\w+)').Groups[1].Value
  $file = "$fam-$w-$st-$($b.Groups[1].Value).woff2"
  Invoke-WebRequest $url -OutFile "$vendor\fonts\$file" -UserAgent $ua -UseBasicParsing
  [void]$outCss.AppendLine("/* $($b.Groups[1].Value) */")
  [void]$outCss.AppendLine(($face -replace [regex]::Escape($url), "fonts/$file"))
  $n++
}
[IO.File]::WriteAllText("$vendor\fonts.css", $outCss.ToString(), (New-Object System.Text.UTF8Encoding $false))
"Polices : $n fichiers"

# 2. Font Awesome 6.5.0 (icônes)
$fa = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0'
Invoke-WebRequest "$fa/css/all.min.css" -OutFile "$vendor\fontawesome\css\all.min.css" -UseBasicParsing
foreach ($f in 'fa-solid-900', 'fa-regular-400', 'fa-brands-400', 'fa-v4compatibility') {
  foreach ($ext in 'woff2', 'ttf') { Invoke-WebRequest "$fa/webfonts/$f.$ext" -OutFile "$vendor\fontawesome\webfonts\$f.$ext" -UseBasicParsing }
}
"Icônes : Font Awesome 6.5.0"
$size = (Get-ChildItem $vendor -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
'Total : {0:N1} Mo' -f $size
