@echo off
setlocal
title HealthChain Version 10 - Close this window to stop the server
color 0A

set "APP_DIR=C:\Users\adity\OneDrive\Desktop\Businesses\Biotech\Version10"
set "PORT=3010"
set "URL=http://localhost:%PORT%/"

cd /d "%APP_DIR%"

echo.
echo  =========================================
echo    HealthChain VERSION 10 ^| Port %PORT%
echo  =========================================
echo.
echo    URL: %URL%
echo.

echo  Checking for an existing Version10 server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo  Opening Version10 in your browser...
start "" "%URL%"
echo.
echo  Close this window to stop the Version10 server.
echo  -----------------------------------------
echo.

"C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port %PORT%
endlocal
