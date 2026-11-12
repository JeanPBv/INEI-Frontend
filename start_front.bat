@echo off
REM Levanta el portal React (Vite) en http://127.0.0.1:5173. Requiere la API en :8000.
cd /d "%~dp0"
if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call npm install
)
call npm run dev
pause
