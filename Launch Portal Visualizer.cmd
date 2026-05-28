@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node scripts\launch-desktop-shell.js
  exit /b 0
)

if exist "dist\win-unpacked\Portal Visualizer.exe" (
  if exist ".env" copy /y ".env" "dist\win-unpacked\.env" >nul
  start "" "dist\win-unpacked\Portal Visualizer.exe"
  exit /b 0
)

echo.
echo No local Electron shell runtime was found.
echo Install Node.js and run npm install, or build the portable shell with npm run pack:win.
pause
exit /b 1
