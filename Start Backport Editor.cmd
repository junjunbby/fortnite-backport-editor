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
echo Starting Fortnite Backport Editor...
echo The app will open in your browser automatically.
echo Keep this window open while you use it.
echo.

node src\Core\server.js --open

echo.
echo App closed.
pause
