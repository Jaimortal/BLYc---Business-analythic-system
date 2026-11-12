Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting BLYc Local Application Stack (Windows PS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start Python Analytics Engine in a separate process
Write-Host "`n[1/2] Starting Python Analytics Engine (127.0.0.1:8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'analytics-engine'; & 'venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

Start-Sleep -Seconds 3

# 2. Start Node.js API and Web Application
Write-Host "[2/2] Starting Node.js Backend & Unified Web App (http://localhost:5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm.cmd start"

Start-Sleep -Seconds 2

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  BLYc is now running!" -ForegroundColor Green
Write-Host "  Open your web browser at: http://localhost:5000" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
