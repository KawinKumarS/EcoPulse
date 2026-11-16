@echo off
title EcoPulse Launcher
cd /d "%~dp0"
echo =============================================================================
echo             EcoPulse - Intelligent Sustainable Building Energy Management
echo =============================================================================
echo Starting FastAPI Backend and React Dashboard...
start "EcoPulse Backend" cmd /c "%~dp0backend\run_backend.bat"
start "EcoPulse Frontend" cmd /c "%~dp0run_frontend.bat"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"
echo Services launched!
echo Backend:  http://localhost:8000 (API & Docs: http://localhost:8000/docs)
echo Frontend: http://localhost:5173
echo =============================================================================
