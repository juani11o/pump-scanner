@echo off
title Crypto Pump Scanner Dashboard Launcher
cd /d "%~dp0"

echo =========================================================
echo   AUTONOMOUS CRYPTO PUMP SCANNER INITIALIZER
echo =========================================================
echo [SYSTEM] Verifying system dependencies...

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+
    pause
    exit /b 1
)

:: Create Virtual Environment if it does not exist
if not exist "venv" (
    echo [SYSTEM] Creating an isolated Python virtual environment...
    python -m venv venv
)

:: Activate Virtual Environment & Install Dependencies
echo [SYSTEM] Activating virtual environment...
call venv\Scripts\activate

echo [SYSTEM] Upgrading pip...
python -m pip install --upgrade pip >nul 2>&1

echo [SYSTEM] Installing dependencies from requirements.txt...
pip install -r backend\requirements.txt

echo =========================================================
echo   LAUNCHING DASHBOARD SERVICE
echo =========================================================
echo [SYSTEM] Starting API server on http://localhost:8000
echo [SYSTEM] Dashboard is ready at http://localhost:8000
echo =========================================================

:: Launch Edge App or browser
timeout /t 2 /nobreak >nul
start msedge --app="http://localhost:8000" || start http://localhost:8000

:: Run the FastAPI backend using Uvicorn
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

pause
