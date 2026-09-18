@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vigotsky System Guard - Lev Vigotsky
color 0E

rem ============================================================================
rem VIGOTSKY SYSTEM GUARD - FIXED 64GB ENABLE
rem - One master BAT.
rem - Wrappers only call labels inside this file.
rem - No duplicate labels.
rem - UWF ENABLE does NOT run cleanup.
rem - UWF ENABLE calls CONFIGURE_64GB_OVERLAY, not swap-check.
rem - Overlay size: 65536 MB / 64 GB.
rem - Strict uwfmgr output checking for Acceso denegado / Error / failed.
rem ============================================================================

set "REQUEST=%~1"
set "DIRECT_MODE=0"
set "START_LABEL="

if /I "%REQUEST%"=="--enable-uwf" set "START_LABEL=ENABLE_UWF"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--disable-uwf" set "START_LABEL=DISABLE_UWF"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--cleanup" set "START_LABEL=CLEANUP_ONLY"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--purge-swap" set "START_LABEL=PURGE_UWF_SWAP"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--class" set "START_LABEL=CLASS_MODE"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--class-ai" set "START_LABEL=CLASS_AI_MODE"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--exam" set "START_LABEL=EXAM_MODE"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--unrestrict" set "START_LABEL=UNRESTRICT"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--kill-apps" set "START_LABEL=KILL_APPS"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--windows-update" set "START_LABEL=WINDOWS_UPDATE_NORMAL"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--uwf-update" set "START_LABEL=UWF_WINDOWS_UPDATE"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--uwf-status" set "START_LABEL=UWF_STATUS"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--status" set "START_LABEL=SYSTEM_STATUS"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--system-status" set "START_LABEL=SYSTEM_STATUS"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--uwf-repair" set "START_LABEL=UWF_REPAIR_QUICK"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--uwf-reset1" set "START_LABEL=UWF_RESET_STAGE1"& set "DIRECT_MODE=1"
if /I "%REQUEST%"=="--uwf-reset2" set "START_LABEL=UWF_RESET_STAGE2"& set "DIRECT_MODE=1"

call :REQUIRE_ADMIN
if errorlevel 1 exit /b 1

call :SET_TOOL_PATHS

if "%DIRECT_MODE%"=="1" (
    if not defined START_LABEL (
        echo [!] Accion no reconocida: %REQUEST%
        pause
        exit /b 1
    )
    call :%START_LABEL%
    set "LASTERR=%ERRORLEVEL%"
    echo.
    pause
    exit /b %LASTERR%
)

:MAIN_MENU
cls
echo ================================================================
echo              VIGOTSKY SYSTEM GUARD - LEV VIGOTSKY
echo ================================================================
echo.
echo [1] ACTIVAR UWF 64 GB
echo [2] DESACTIVAR UWF
echo [3] PURGAR UWF SWAP VIEJO / UWFswap.sys
echo [4] LIMPIAR HISTORIAL, CARPETAS Y PAPELERA
echo [5] MODO CLASE
echo [6] MODO CLASE + AI
echo [7] MODO EXAMEN
echo [8] QUITAR RESTRICCIONES
echo [9] CERRAR APPS DEL USUARIO
echo [10] ESTADO DEL SISTEMA
echo [11] REPARAR UWF RAPIDO
echo [12] RESET UWF ETAPA 1 - DESINSTALAR FEATURE
echo [13] RESET UWF ETAPA 2 - REINSTALAR FEATURE
echo [14] WINDOWS UPDATE NORMAL
echo [15] MANTENIMIENTO UWF PARA WINDOWS UPDATE
echo [16] SALIR
echo.
set /p "OP=Seleccione una opcion: "

set "TARGET="
if "%OP%"=="1" set "TARGET=ENABLE_UWF"
if "%OP%"=="2" set "TARGET=DISABLE_UWF"
if "%OP%"=="3" set "TARGET=PURGE_UWF_SWAP"
if "%OP%"=="4" set "TARGET=CLEANUP_ONLY"
if "%OP%"=="5" set "TARGET=CLASS_MODE"
if "%OP%"=="6" set "TARGET=CLASS_AI_MODE"
if "%OP%"=="7" set "TARGET=EXAM_MODE"
if "%OP%"=="8" set "TARGET=UNRESTRICT"
if "%OP%"=="9" set "TARGET=KILL_APPS"
if "%OP%"=="10" set "TARGET=UWF_STATUS"
if "%OP%"=="11" set "TARGET=UWF_REPAIR_QUICK"
if "%OP%"=="12" set "TARGET=UWF_RESET_STAGE1"
if "%OP%"=="13" set "TARGET=UWF_RESET_STAGE2"
if "%OP%"=="14" set "TARGET=WINDOWS_UPDATE_NORMAL"
if "%OP%"=="15" set "TARGET=UWF_WINDOWS_UPDATE"
if "%OP%"=="16" exit /b 0

if defined TARGET (
    call :%TARGET%
    echo.
    pause
    goto MAIN_MENU
)

echo.
echo [!] Opcion invalida.
timeout /t 2 >nul
goto MAIN_MENU

rem ============================================================================
rem BASIC HELPERS
rem ============================================================================

:REQUIRE_ADMIN
net session >nul 2>&1
if "%errorlevel%"=="0" exit /b 0
echo.
echo [!] Solicitando permisos de administrador...
if "%REQUEST%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%REQUEST%' -Verb RunAs"
)
exit /b 1

:SET_TOOL_PATHS
set "UWF_EXE="
if exist "%SystemRoot%\Sysnative\uwfmgr.exe" set "UWF_EXE=%SystemRoot%\Sysnative\uwfmgr.exe"
if not defined UWF_EXE if exist "%SystemRoot%\System32\uwfmgr.exe" set "UWF_EXE=%SystemRoot%\System32\uwfmgr.exe"
if not defined UWF_EXE (
    where uwfmgr.exe >nul 2>&1
    if not errorlevel 1 set "UWF_EXE=uwfmgr.exe"
)
exit /b 0

:RUN_UWF
set "UWF_TMP=%TEMP%\uwf_cmd_%RANDOM%_%RANDOM%.txt"
set "UWF_BAD="
"%UWF_EXE%" 