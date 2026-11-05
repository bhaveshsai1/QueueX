@echo off
title Smart OPD - Next.js Frontend (Port 3000)
echo ========================================================
echo   Starting Smart OPD Next.js Frontend
echo   Port: 3000 | URL: http://localhost:3000
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause

