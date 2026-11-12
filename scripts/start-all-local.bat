@echo off
echo ========================================================
echo   Starting BLYc Local Application Stack (Windows)
echo ========================================================
echo.
echo [1/2] Starting Python Analytics Engine (127.0.0.1:8001)...
start "BLYc Python Analytics Engine" cmd /k "cd analytics-engine && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Node.js Backend & Serving Frontend (http://localhost:5000)...
start "BLYc Server & Web Application" cmd /k "cd backend && npm.cmd start"

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo   BLYc is running!
echo   Open your browser at: http://localhost:5000
echo ========================================================
echo.
pause
