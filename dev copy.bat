@echo off
REM ---------------------------------------------------------------
REM  dev.bat - free the dev ports, then start the local dev server
REM  Backend: 3000 (PORT env)   Frontend: 3011
REM ---------------------------------------------------------------

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" || (
  echo Failed to change to script directory: "%SCRIPT_DIR%"
  exit /b 1
)

set PORTS=3000 3011 3069

for %%P in (%PORTS%) do (
  echo Checking port %%P...
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
    echo   Killing PID %%I on port %%P
    taskkill /F /PID %%I >nul 2>&1
  )
)

popd

echo.
echo Press any key to close this window...
pause >nul

