@echo off
title EcoPulse React Dashboard
cd /d "%~dp0"
echo ========================================================
echo Starting EcoPulse React Dashboard on Port 5173
echo ========================================================
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm.cmd install --legacy-peer-deps
)
call npm.cmd run dev
pause
