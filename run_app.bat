@echo off
REM Start Vikasa Tarangini backend server
start cmd /k "npm start --prefix server"

REM Start Vikasa Tarangini frontend client (Vite dev server)
start cmd /k "npm run dev --prefix client"

echo Both services have been launched. Close this window to exit.
pause
