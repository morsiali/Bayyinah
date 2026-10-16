@echo off
REM Bayyinah - production build and start on http://localhost:3000
cd /d "%~dp0"
REM Bring the database up to date with the latest schema (adds new tables such as the SMS inbox).
call npx prisma db push || (pause & exit /b 1)
call npm run build || (pause & exit /b 1)
start "" http://localhost:3000
call npm run start
