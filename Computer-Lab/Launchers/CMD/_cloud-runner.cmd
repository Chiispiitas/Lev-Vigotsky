@echo off
setlocal EnableExtensions
title Lev Vigotsky Computer Lab - Cloud Launcher

set "LV_ACTION=%~1"
if not defined LV_ACTION set "LV_ACTION=--menu"

set "LV_VALID="
for %%A in (--menu --class --class-ai --exam --unrestrict --kill-apps --cleanup --enable-uwf --disable-uwf --purge-swap --status --system-status --uwf-status --uwf-repair --uwf-reset1 --uwf-reset2 --windows-update --uwf-update) do (
    if /I "%LV_ACTION%"=="%%~A" set "LV_VALID=1"
)
if not defined LV_VALID goto INVALID_ACTION

set "LV_RUNTIME=%TEMP%\LevVigotskyCloud"
set "LV_MASTER=%LV_RUNTIME%\uwf-menu.bat"
set "LV_DOWNLOAD=%LV_RUNTIME%\uwf-menu.download"
set "LV_URL=https://raw.githubusercontent.com/Chiispiitas/Lev-Vigotsky/main/Computer-Lab/uwf-menu.bat"
set "LV_FETCH_URL=%LV_URL%?cb=%RANDOM%%RANDOM%%RANDOM%"

if not exist "%LV_RUNTIME%" md "%LV_RUNTIME%" >nul 2>&1
del /f /q "%LV_DOWNLOAD%" >nul 2>&1
del /f /q "%LV_MASTER%" >nul 2>&1

echo [INFO] Obteniendo la version actual de Lev Vigotsky System Guard...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -TimeoutSec 30 -Uri '%LV_FETCH_URL%' -OutFile '%LV_DOWNLOAD%'; $f=Get-Item -LiteralPath '%LV_DOWNLOAD%'; if($f.Length -lt 10000){throw 'La descarga es demasiado pequena.'}; Move-Item -LiteralPath '%LV_DOWNLOAD%' -Destination '%LV_MASTER%' -Force"

if errorlevel 1 goto DOWNLOAD_ERROR
if not exist "%LV_MASTER%" goto DOWNLOAD_ERROR
for %%A in ("%LV_MASTER%") do if %%~zA LSS 10000 goto DOWNLOAD_ERROR

echo [OK] Version actual descargada.
if /I "%LV_ACTION%"=="--menu" (
    call "%LV_MASTER%"
) else (
    call "%LV_MASTER%" "%LV_ACTION%"
)
set "LV_EXIT=%ERRORLEVEL%"
exit /b %LV_EXIT%

:DOWNLOAD_ERROR
del /f /q "%LV_DOWNLOAD%" >nul 2>&1
del /f /q "%LV_MASTER%" >nul 2>&1
echo.
echo [ERROR] No se pudo descargar la version actual de Lev Vigotsky System Guard.
echo [ERROR] Por seguridad NO se ejecutara ninguna copia antigua o almacenada.
echo [INFO] Revise la conexion a Internet de este equipo e intentelo de nuevo.
echo.
pause
exit /b 1

:INVALID_ACTION
echo [ERROR] Accion no reconocida: %LV_ACTION%
pause
exit /b 2
