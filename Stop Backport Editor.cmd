@echo off
setlocal
title Stop Fortnite Backport Editor

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5179" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo Fortnite Backport Editor stopped.
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul
