@echo off
chcp 65001 >nul
title Installation de Mon Cabinet
cd /d "%~dp0"
echo.
echo   Installation de Mon Cabinet...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
echo.
echo   C'est fait ! L'icone Mon Cabinet est sur le bureau.
echo.
pause
