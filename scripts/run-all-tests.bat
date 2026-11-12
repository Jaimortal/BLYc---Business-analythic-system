@echo off
echo ========================================================
echo   BLYc - Business Analytics Calculator: Test Suite
echo ========================================================
echo.

echo [1/4] Running Python Analytics Engine Test Suite...
set PYTHONPATH=analytics-engine
"analytics-engine\venv\Scripts\python.exe" -m pytest analytics-engine\tests
if %errorlevel% neq 0 (
    echo [ERROR] Python Analytics Engine tests failed!
    exit /b %errorlevel%
)
echo [OK] All Python tests passed!
echo.

echo [2/4] Running Backend TypeScript Compilation...
cd backend
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    cd ..
    exit /b %errorlevel%
)
echo [OK] Backend build succeeded!
echo.

echo [3/4] Running Backend Automated Tests...
echo Running Project System Tests...
node dist/test-project.js
if %errorlevel% neq 0 (
    echo [ERROR] Project System tests failed!
    cd ..
    exit /b %errorlevel%
)

echo Running AI Assistant Tests...
node dist/test-ai.js
if %errorlevel% neq 0 (
    echo [ERROR] AI Assistant tests failed!
    cd ..
    exit /b %errorlevel%
)
cd ..
echo [OK] All Backend tests passed!
echo.

echo [4/4] Running Frontend Production Build Check...
cd frontend
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    exit /b %errorlevel%
)
cd ..
echo [OK] Frontend production build succeeded!
echo.

echo ========================================================
echo   ALL SYSTEM CHECKS AND TESTS PASSED CLEANLY!
echo ========================================================
