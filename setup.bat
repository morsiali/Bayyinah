@echo off
REM Bayyinah - first-time setup on Windows. Requires Node.js 20 or newer.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
echo Installing packages (this takes a few minutes the first time)...
call npm install || (echo npm install failed. & pause & exit /b 1)
call npm run setup || (echo Setup failed. & pause & exit /b 1)
echo.
echo Setup complete. Double-click start.bat to run Bayyinah.
pause
