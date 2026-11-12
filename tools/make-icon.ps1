# Dessine l'icône de Mon Cabinet (croix médicale claire sur rond vert-bleu) et l'enregistre en .ico et .png
param([string]$Out = "$PSScriptRoot\..\app")
Add-Type -AssemblyName System.Drawing
$sizes = 256, 64, 48, 32, 16
$pngs = @()
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $sea = [System.Drawing.Color]::FromArgb(61, 109, 120)
  $dawn = [System.Drawing.Color]::FromArgb(231, 169, 130)
  $m = [Math]::Max(1, [int]($s * 0.03))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $sea), $m, $m, $s - 2 * $m, $s - 2 * $m)
  $w = [int]($s * 0.20); $l = [int]($s * 0.56); $o = [int](($s - $l) / 2); $c = [int](($s - $w) / 2)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillRectangle($white, $c, $o, $w, $l)
  $g.FillRectangle($white, $o, $c, $l, $w)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $dawn), $c + [int]($w * 0.25), $c + [int]($w * 0.25), [int]($w * 0.5), [int]($w * 0.5))
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  if ($s -eq 256) { $bmp.Save((Join-Path $Out 'icone.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
  $pngs += ,@($s, $ms.ToArray())
  $bmp.Dispose()
}
# Fichier .ico contenant plusieurs tailles (images PNG intégrées)
$fs = [System.IO.File]::Create((Join-Path $Out 'icone.ico'))
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$pngs.Count)
$offset = 6 + 16 * $pngs.Count
foreach ($p in $pngs) {
  $sz = $p[0]; $data = $p[1]
  $bw.Write([byte]($(if ($sz -ge 256) { 0 } else { $sz }))); $bw.Write([byte]($(if ($sz -ge 256) { 0 } else { $sz })))
  $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length); $bw.Write([UInt32]$offset); $offset += $data.Length
}
foreach ($p in $pngs) { $bw.Write($p[1]) }
$bw.Close()
"icone.ico et icone.png créés dans $Out"
