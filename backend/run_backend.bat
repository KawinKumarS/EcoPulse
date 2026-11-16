@echo off
title EcoPulse FastAPI Backend Service
cd /d "%~dp0\.."
echo ========================================================
echo Starting EcoPulse FastAPI Backend Service on Port 8000
echo ========================================================
set "PYTHON_EXE=C:\Users\skawi\AppData\Local\Programs\Python\Python312\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

"%PYTHON_EXE%" -c "import fastapi, uvicorn, serial" 2>nul
if errorlevel 1 (
    echo Installing Python backend dependencies...
    "%PYTHON_EXE%" -m pip install -r backend\requirements.txt
)

"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
pause
