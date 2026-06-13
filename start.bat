@echo off
title Construction Estimator - Startup
cd /d "%~dp0"
set ROOT=%~dp0

echo.
echo  ============================================
echo   Construction Cost Estimator - Dev Startup
echo  ============================================
echo.

if not exist "%ROOT%backend\.env" (
  echo  [ERROR] Missing backend\.env
  echo  Please create backend\.env with your GROQ_API_KEY and DATABASE_URL.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\node_modules" (
  echo  Installing backend dependencies...
  pushd "%ROOT%backend"
  call npm install
  popd
)

if not exist "%ROOT%frontend\node_modules" (
  echo  Installing frontend dependencies...
  pushd "%ROOT%frontend"
  call npm install
  popd
)

echo  Clearing ports 3001 and 5173 if in use...
powershell -NoProfile -Command "3001,5173 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

ping -n 3 127.0.0.1 >nul

echo  [1/2] Starting backend  ^(port 3001^) ...
start "Backend - Port 3001" cmd /k ""%ROOT%start-backend.bat""

ping -n 4 127.0.0.1 >nul

echo  [2/2] Starting frontend ^(port 5173^) ...
start "Frontend - Port 5173" cmd /k ""%ROOT%start-frontend.bat""

ping -n 8 127.0.0.1 >nul

echo  Opening registration page ...
start "" "http://localhost:5173?reset=1"

echo.
echo  ============================================
echo   App running at http://localhost:5173
echo   Registration page will open automatically.
echo   Close the two terminal windows to stop.
echo  ============================================
echo.
