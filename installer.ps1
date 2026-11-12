# Crée le raccourci « Mon Cabinet » sur le bureau et dans le menu Démarrer.
param([string[]]$Destinations = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')))
$dossier = Split-Path -Parent $MyInvocation.MyCommand.Path
$ws = New-Object -ComObject WScript.Shell
foreach ($dest in $Destinations) {
  $lnk = $ws.CreateShortcut((Join-Path $dest 'Mon Cabinet.lnk'))
  $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
  $lnk.Arguments = '"' + (Join-Path $dossier 'Mon Cabinet.vbs') + '"'
  $lnk.WorkingDirectory = $dossier
  $lnk.IconLocation = (Join-Path $dossier 'app\icone.ico') + ',0'
  $lnk.Description = 'Dossiers des patients'
  $lnk.Save()
  Write-Host "  Raccourci créé : $dest"
}
