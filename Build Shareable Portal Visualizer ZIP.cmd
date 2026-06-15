@echo off
setlocal
cd /d "%~dp0"
call npm run bundle:share
if errorlevel 1 (
  echo.
  echo Shareable ZIP build failed.
  pause
)
