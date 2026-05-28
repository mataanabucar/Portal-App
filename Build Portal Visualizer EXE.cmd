@echo off
setlocal
cd /d "%~dp0"
call npm run dist:win
if errorlevel 1 (
  echo.
  echo EXE build failed.
  pause
)
