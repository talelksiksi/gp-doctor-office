@echo off
chcp 65001 >nul
title Mon Cabinet
cd /d "%~dp0"
if exist "runtime\node.exe" (
  "runtime\node.exe" serveur.js
) else (
  node serveur.js
)
if errorlevel 1 (
  echo.
  echo Un probleme est survenu. Appelez Talel.
  pause
)
