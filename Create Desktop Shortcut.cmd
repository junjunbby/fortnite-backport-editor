@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $target=(Resolve-Path '.\Start Backport Editor.cmd').Path; $shortcut=Join-Path $desktop 'Fortnite Backport Editor.lnk'; $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($shortcut); $link.TargetPath=$target; $link.WorkingDirectory=(Get-Location).Path; $link.Description='Fortnite Backport Editor'; $link.Save()"

echo Desktop shortcut created.
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul
