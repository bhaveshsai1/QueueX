@echo off
title Smart OPD - Python Backend (Port 8000)
echo ========================================================
echo   Starting Smart OPD Python FastAPI Queue Engine
echo   Port: 8000 | Docs: http://localhost:8000/docs
echo ========================================================
cd /d "%~dp0backend"

set PYTHON_EXE=python
if exist "C:\Users\syamk\AppData\Local\Programs\Python\Python310\python.exe" (
    set "PYTHON_EXE=C:\Users\syamk\AppData\Local\Programs\Python\Python310\python.exe"
)

"%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
