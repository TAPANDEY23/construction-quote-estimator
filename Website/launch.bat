@echo off
title Construction Estimator — Launcher
cd /d "%~dp0"

echo.
echo  ============================================
echo   Construction Quote Estimator — Launcher
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js is not installed or not in PATH.
  echo  Please install Node.js from https://nodejs.org
  echo.
  pause
  exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
  echo  [1/2] Installing dependencies...
  call npm install --silent
  echo  Done.
  echo.
)

:: Start the launcher server in this window
echo  [2/2] Starting launcher server on port 4000...
echo.

:: Open browser after a short delay (non-blocking)
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4000"

:: Run the server (keeps this window open)
node server.js
