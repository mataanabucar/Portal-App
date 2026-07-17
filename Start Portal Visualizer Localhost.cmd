@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is required to run this localhost bundle.
  echo Install Node.js 20+ and run this launcher again.
  pause
  exit /b 1
)
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo.
  echo A new .env was created from .env.example.
  echo Configure the required credentials, then run this launcher again.
  pause
  exit /b 1
)
node scripts\launch-localhost-prod.js
exit /b %errorlevel%
