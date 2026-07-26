@echo off
setlocal enabledelayedexpansion

echo === Kroos Master Deploy ===

echo.
echo 1. Validando variables de entorno...
cd /d "%~dp0backend"
call npm run check:env

echo.
echo 2. Compilando backend...
call npm run build

echo.
echo 3. Verificando tipos frontend...
cd ..\frontend
call npm run typecheck

echo.
echo 4. Build de produccion EAS...
eas build --profile production --platform all

echo.
echo Deploy completado.
pause
