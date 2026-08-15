@echo off
setlocal
title Fortnite Backport Editor
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo Install Node.js, then double-click this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting Fortnite Backport Editor as a local desktop app...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -WindowStyle Hidden -FilePath node -ArgumentList 'src\Core\server.js','--desktop' -WorkingDirectory '%~dp0'"

echo.
echo App is starting.
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul
