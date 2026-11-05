@echo off
title Smart OPD Launcher
echo ========================================================
echo   Launching Smart OPD System Prototype (Backend + Frontend)
echo ========================================================
start "Smart OPD Backend (FastAPI)" cmd /c "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "Smart OPD Frontend (Next.js)" cmd /c "%~dp0start-frontend.bat"
echo.
echo Both servers have been launched:
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit this launcher window (servers keep running).
pause >nul

