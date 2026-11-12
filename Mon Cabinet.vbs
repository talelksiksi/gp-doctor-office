' Mon Cabinet : démarre le programme sans fenêtre noire, puis ouvre l'application.
' Si le programme tourne déjà, il ouvre simplement une nouvelle fenêtre.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dossier = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dossier
node = dossier & "\runtime\node.exe"
If Not fso.FileExists(node) Then node = "node"
sh.Run """" & node & """ """ & dossier & "\serveur.js""", 0, False
