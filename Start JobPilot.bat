@echo off
rem Double-click this file to start JobPilot on Windows.
title JobPilot
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Installing it now, this takes a minute...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  set "PATH=%PATH%;%ProgramFiles%\nodejs"
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Please install Node.js from the page that just opened, choose the LTS version,
  echo then double-click "Start JobPilot" again.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist node_modules (
  echo Downloading what the app needs. This happens once and takes a few minutes...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Could not download everything. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

node scripts\start.mjs
pause
