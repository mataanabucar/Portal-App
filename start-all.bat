@echo off
REM ===============================================================
REM  start-all.bat - full startup for the Portal App
REM
REM  Gets everything running and connected in the right order:
REM    1. Free the dev ports (3000 backend, 3011 frontend,
REM       3069/3070 graph-tester)
REM    2. Install dependencies if node_modules is missing
REM       (root + frontend)
REM    3. Make sure the Microsoft 365 (Graph) sign-in exists;
REM       offer a one-time graph-tester login if it doesn't
REM    4. Launch the app (npm run dev = backend + frontend + browser)
REM
REM  TeamGPT / Genny Studio / KB share one JWT that is scraped
REM  automatically on the first request (a browser login window
REM  pops up only if the cached token has expired) - no step needed
REM  here. Graph tokens auto-refresh once you have signed in once.
REM ===============================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" || (
  echo Failed to change to script directory: "%SCRIPT_DIR%"
  exit /b 1
)

REM --- 0. Sanity: .env present? ---------------------------------
if not exist ".env" (
  echo [warn] No .env file found. The app will boot on defaults, but
  echo        TeamGPT / Genny Studio / Graph need real values in .env.
  echo        Copy .env.example to .env and fill it in for full function.
  echo.
)

REM --- 1. Free the dev ports -----------------------------------
set PORTS=3000 3011 3069 3070
for %%P in (%PORTS%) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
    echo   Freeing port %%P (killing PID %%I)
    taskkill /F /PID %%I >nul 2>&1
  )
)

REM --- 2. Install dependencies if missing -----------------------
if not exist "node_modules" (
  echo.
  echo [setup] Root node_modules missing - running npm install...
  call npm install
  if errorlevel 1 (
    echo [error] npm install failed in the project root.
    popd & endlocal & exit /b 1
  )
)

if not exist "frontend\node_modules" (
  echo.
  echo [setup] Frontend node_modules missing - running npm install...
  call npm --prefix frontend install
  if errorlevel 1 (
    echo [error] npm install failed in frontend.
    popd & endlocal & exit /b 1
  )
)

REM --- 3. Microsoft 365 (Graph) sign-in -------------------------
REM  getAccessToken() auto-refreshes from this cache, so you only
REM  need to sign in when it is absent. Mail / calendar / Teams
REM  routes and the realtime email tools depend on it.
if not exist ".local-auth\graph-tester-token.json" (
  echo.
  echo [auth] No Microsoft 365 sign-in found.
  echo        Mail / calendar / Teams features need a one-time login.
  choice /c YN /t 15 /d N /m "Open the Graph sign-in now (Y), or skip and start anyway (N)?"
  if !errorlevel! equ 1 (
    echo   Launching graph-tester in a new window - sign in, then close it.
    start "Graph Tester - sign in" cmd /c "npm run graph-tester"
    echo   Waiting 20s for you to complete the sign-in...
    timeout /t 20 /nobreak >nul
  ) else (
    echo   Skipping - mail/calendar/Teams will prompt to sign in when used.
  )
)

REM --- 4. Launch the app ---------------------------------------
echo.
echo ===============================================================
echo  Starting Portal App
echo    Backend:  http://127.0.0.1:3000
echo    Frontend: http://localhost:3011  (opens automatically)
echo  Press Ctrl+C to stop everything.
echo ===============================================================
echo.

call npm run dev

popd
endlocal
