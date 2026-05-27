@echo off
title Construction Estimator - Startup
cd /d "%~dp0"

echo.
echo  ========================================
echo   Construction Cost Estimator - Startup
echo  ========================================
echo.

if not exist "backend\.env" (
  echo  [ERROR] Missing backend\.env
  echo  Please create backend\.env and add: GROQ_API_KEY=your_key
  echo.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo  Installing backend dependencies...
  pushd backend
  call npm install
  popd
)

if not exist "frontend\node_modules" (
  echo  Installing frontend dependencies...
  pushd frontend
  call npm install
  popd
)

echo  [1/2] Starting backend server on port 3001...
start /d "%~dp0backend" "Backend - Construction Estimator" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo  [2/2] Starting frontend dev server on port 5173...
start /d "%~dp0frontend" "Frontend - Construction Estimator" cmd /k "npm run dev"

echo.
echo  Both servers are starting. Frontend: http://localhost:5173
echo.