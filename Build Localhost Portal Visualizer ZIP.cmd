@echo off
setlocal
cd /d "%~dp0"
call npm run bundle:localhost
if errorlevel 1 (
  echo.
  echo Localhost shareable ZIP build failed.
  pause
)
