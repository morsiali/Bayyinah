@echo off
REM Bayyinah - production build and start on http://localhost:3000
cd /d "%~dp0"
call npm run build || (pause & exit /b 1)
start "" http://localhost:3000
call npm run start
