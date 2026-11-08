@echo off
rem Double-click to see TWELVE exactly as it would run on Vercel (a production
rem build), on this computer at http://localhost:3000.
rem Keep this window open while using the app; close it to stop.
title TWELVE
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing packages, this takes a few minutes...
  call npm install
)

echo Building TWELVE (about a minute)...
call npm run build
if errorlevel 1 (
  echo The build failed. See the messages above.
  pause
  exit /b 1
)

start "" http://localhost:3000
echo TWELVE is running at http://localhost:3000 - sign in with an email listed in Admin
call npx next start -p 3000
pause
