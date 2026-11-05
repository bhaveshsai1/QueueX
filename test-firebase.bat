@echo off
title Smart OPD - Firebase Firestore Diagnostics
echo ========================================================
echo Testing Firebase Firestore Connection...
echo ========================================================

set PYTHON_CMD=C:\Users\syamk\AppData\Local\Programs\Python\Python310\python.exe
if not exist "%PYTHON_CMD%" (
    set PYTHON_CMD=python
)

"%PYTHON_CMD%" backend\test_firebase.py

echo.
pause

