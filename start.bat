@echo off
REM Bayyinah - start the app on http://localhost:3000
cd /d "%~dp0"
if not exist node_modules (echo Run setup.bat first. & pause & exit /b 1)
REM Bring the database up to date with the latest schema (adds new tables such as the SMS inbox).
call npx prisma db push || (pause & exit /b 1)
start "" http://localhost:3000
call npm run dev
