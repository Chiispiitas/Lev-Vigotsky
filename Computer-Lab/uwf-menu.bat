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
"%UWF_EXE%" %* > "%UWF_TMP%" 2>&1
set "UWF_RET=%ERRORLEVEL%"
type "%UWF_TMP%"
findstr /i /c:"Error:" /c:"Acceso denegado" /c:"Access is denied" /c:"Access denied" /c:"denied" /c:"ha fallado" /c:"failed" /c:"0x8000FFFF" "%UWF_TMP%" >nul 2>&1
if not errorlevel 1 set "UWF_BAD=1"
del /q "%UWF_TMP%" >nul 2>&1
if not "%UWF_RET%"=="0" exit /b %UWF_RET%
if defined UWF_BAD exit /b 1
exit /b 0

:GET_C_FREE_MB
set "FREE_MB="
for /f %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "[math]::Floor((Get-PSDrive -Name C).Free/1MB)"') do set "FREE_MB=%%A"
if not defined FREE_MB exit /b 1
exit /b 0

:GET_FILE_SIZE_MB
set "FILE_TO_CHECK=%~1"
set "FILE_SIZE_MB=0"
if not exist "%FILE_TO_CHECK%" exit /b 0
for /f %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "if(Test-Path '%FILE_TO_CHECK%'){[math]::Ceiling((Get-Item '%FILE_TO_CHECK%' -Force).Length/1MB)}else{0}"') do set "FILE_SIZE_MB=%%A"
if not defined FILE_SIZE_MB set "FILE_SIZE_MB=0"
exit /b 0

:DELETE_TREE_CONTENTS
set "TARGET_PATH=%~1"
if "%TARGET_PATH%"=="" exit /b 0
if not exist "%TARGET_PATH%" exit /b 0
del /f /q "%TARGET_PATH%\*" >nul 2>&1
for /d %%D in ("%TARGET_PATH%\*") do rd /s /q "%%~fD" >nul 2>&1
exit /b 0

rem ============================================================================
rem UWF ACTIONS
rem ============================================================================

:ENABLE_UWF
cls
echo ================================================================
echo                    ACTIVAR UWF - 64 GB
echo ================================================================
echo.
echo [INFO] Esta accion NO ejecuta limpieza.
echo [INFO] Limpieza separada: uwf-cleanup.bat o menu opcion 4.
echo.

call :SET_TOOL_PATHS

if not defined UWF_EXE (
    echo [!] uwfmgr.exe no encontrado.
    echo [INFO] Intentando instalar la caracteristica UWF...
    dism /online /enable-feature /featurename:Client-UnifiedWriteFilter /all /norestart
    echo.
    echo Reinicie y vuelva a ejecutar uwf-enable.bat.
    exit /b 1
)

echo [1/4] Revisando UWFswap.sys viejo...
call :CHECK_OLD_SWAP_BEFORE_ENABLE
if errorlevel 1 exit /b 1

echo.
echo [2/4] Configurando overlay DISK de 64 GB...
call :CONFIGURE_64GB_OVERLAY
if errorlevel 1 (
    echo.
    echo [!] No se pudo configurar overlay de 64 GB.
    echo.
    echo SOLUCION RECOMENDADA:
    echo 1. Ejecutar uwf-disable.bat
    echo 2. Reiniciar
    echo 3. Ejecutar uwf-purge-swap.bat
    echo 4. Ejecutar uwf-enable.bat
    echo 5. Reiniciar
    exit /b 1
)

echo.
echo [3/4] Protegiendo volumen C:...
call :RUN_UWF volume protect C:
if errorlevel 1 (
    echo.
    echo [!] Fallo: uwfmgr volume protect C:
    echo     Si aparece 0x8000FFFF, use RESET UWF etapa 1 y etapa 2.
    exit /b 1
)

echo.
echo [4/4] Activando filtro UWF para el proximo reinicio...
call :RUN_UWF filter enable
if errorlevel 1 (
    echo.
    echo [!] Fallo: uwfmgr filter enable
    echo     Si aparece 0x8000FFFF, use RESET UWF etapa 1 y etapa 2.
    exit /b 1
)

echo.
echo [OK] UWF 64 GB configurado. Reinicie para aplicar.
exit /b 0

:CHECK_OLD_SWAP_BEFORE_ENABLE
set "SWAP_FILE=%SystemDrive%\uwfswap.sys"
call :GET_FILE_SIZE_MB "%SWAP_FILE%"
if not exist "%SWAP_FILE%" (
    echo [OK] No existe %SWAP_FILE%
    exit /b 0
)

echo [INFO] Existe %SWAP_FILE% con tamano aproximado: %FILE_SIZE_MB% MB

if %FILE_SIZE_MB% GTR 80000 (
    echo [!] El swap actual es mas grande que 80 GB.
    echo     Esto parece venir del overlay viejo exagerado.
    echo     Intentando eliminarlo antes de configurar 64 GB...
    call :TRY_DELETE_UWF_SWAP
    if errorlevel 1 (
        echo.
        echo [!] No se pudo eliminar %SWAP_FILE%.
        echo     Probablemente UWF sigue activo en la sesion actual o el archivo esta bloqueado.
        echo.
        echo HAGA ESTO:
        echo 1. Ejecutar uwf-disable.bat
        echo 2. Reiniciar
        echo 3. Ejecutar uwf-purge-swap.bat
        echo 4. Ejecutar uwf-enable.bat
        exit /b 1
    )
    exit /b 0
)

echo [OK] El swap no parece estar sobredimensionado.
exit /b 0

:CONFIGURE_64GB_OVERLAY
set "OVERLAY_MB=65536"
set "WARN_MB=49152"
set "CRIT_MB=61440"
set "MIN_FREE_MB=81920"

echo [INFO] Tamano solicitado: %OVERLAY_MB% MB / 64 GB
echo [INFO] Warning: %WARN_MB% MB / 48 GB
echo [INFO] Critical: %CRIT_MB% MB / 60 GB
echo [INFO] Minimo libre requerido en C:: %MIN_FREE_MB% MB / 80 GB
echo.

call :GET_C_FREE_MB
if errorlevel 1 (
    echo [!] No se pudo detectar el espacio libre de C:.
    exit /b 1
)

echo [INFO] Espacio libre detectado en C:: %FREE_MB% MB

if %FREE_MB% LSS %MIN_FREE_MB% (
    echo.
    echo [!] ESPACIO INSUFICIENTE.
    echo     Para overlay 64 GB se requieren al menos %MIN_FREE_MB% MB libres.
    echo     Detectado: %FREE_MB% MB
    exit /b 1
)

call :RUN_UWF overlay set-type DISK
if errorlevel 1 exit /b 1

call :RUN_UWF overlay set-size %OVERLAY_MB%
if errorlevel 1 (
    echo.
    echo [!] set-size %OVERLAY_MB% fallo.
    echo     Si ve Acceso denegado, UWF probablemente esta activo en esta sesion.
    exit /b 1
)

call :RUN_UWF overlay set-warningthreshold %WARN_MB%
if errorlevel 1 exit /b 1

call :RUN_UWF overlay set-criticalthreshold %CRIT_MB%
if errorlevel 1 exit /b 1

call :RUN_UWF overlay set-passthrough on
if errorlevel 1 echo [!] Aviso: set-passthrough no fue aceptado, se continua.

echo.
echo [OK] Overlay 64 GB solicitado correctamente.
exit /b 0

:DISABLE_UWF
cls
echo ================================================================
echo                       DESACTIVAR UWF
echo ================================================================
echo.
call :SET_TOOL_PATHS

if not defined UWF_EXE (
    echo [!] uwfmgr.exe no encontrado.
    exit /b 1
)

echo [1/3] Desactivando filtro para el proximo reinicio...
call :RUN_UWF filter disable

echo.
echo [2/3] Desprotegiendo C: para el proximo reinicio...
call :RUN_UWF volume unprotect C:

echo.
echo [3/3] Restaurando recuperacion normal de Windows...
bcdedit /deletevalue {current} bootstatuspolicy >nul 2>&1

echo.
echo [OK] UWF quedara desactivado/desprotegido despues de reiniciar.
echo [INFO] Despues del reinicio puede ejecutar uwf-purge-swap.bat.
exit /b 0

:PURGE_UWF_SWAP
cls
echo ================================================================
echo                  PURGAR UWFswap.sys VIEJO
echo ================================================================
echo.
echo Esto elimina %SystemDrive%\uwfswap.sys si esta desbloqueado.
echo Use esto despues de uwf-disable.bat + reinicio.
echo.
call :GET_FILE_SIZE_MB "%SystemDrive%\uwfswap.sys"
if not exist "%SystemDrive%\uwfswap.sys" (
    echo [OK] No existe %SystemDrive%\uwfswap.sys
    exit /b 0
)
echo [INFO] Tamano actual: %FILE_SIZE_MB% MB
echo.
choice /c SN /n /m "Eliminar %SystemDrive%\uwfswap.sys ? [S/N]: "
if errorlevel 2 exit /b 1

call :TRY_DELETE_UWF_SWAP
if errorlevel 1 (
    echo.
    echo [!] No se pudo eliminar. Ejecute uwf-disable.bat, reinicie, y vuelva a intentar.
    exit /b 1
)

echo.
echo [OK] UWFswap.sys eliminado.
exit /b 0

:TRY_DELETE_UWF_SWAP
set "SWAP_FILE=%SystemDrive%\uwfswap.sys"
if not exist "%SWAP_FILE%" exit /b 0
attrib -s -h -r "%SWAP_FILE%" >nul 2>&1
takeown /f "%SWAP_FILE%" /a >nul 2>&1
icacls "%SWAP_FILE%" /grant Administrators:F /c >nul 2>&1
del /f /q "%SWAP_FILE%" >nul 2>&1
if exist "%SWAP_FILE%" exit /b 1
exit /b 0

:UWF_STATUS
cls
echo ================================================================
echo                     ESTADO DEL SISTEMA
echo ================================================================
echo.
echo [1/6] UWF / Unified Write Filter
echo ---------------------------------------------------------------
call :SET_TOOL_PATHS
if defined UWF_EXE (
    echo uwfmgr usado: %UWF_EXE%
    echo.
    "%UWF_EXE%" get-config
) else (
    echo [!] uwfmgr.exe no encontrado. UWF puede no estar instalado.
)
echo.
echo [2/6] UWFswap.sys
echo ---------------------------------------------------------------
call :GET_FILE_SIZE_MB "%SystemDrive%\uwfswap.sys"
if exist "%SystemDrive%\uwfswap.sys" (
    echo %SystemDrive%\uwfswap.sys = %FILE_SIZE_MB% MB
) else (
    echo No existe %SystemDrive%\uwfswap.sys
)
echo.
echo [3/6] Servicios UWF
echo ---------------------------------------------------------------
for %%S in (uwfvol uwfs uwfreg) do (
    echo.
    echo %%S:
    reg query "HKLM\SYSTEM\CurrentControlSet\Services\%%S" /v Start 2>nul
    if errorlevel 1 echo     No encontrado
)
echo.
echo [4/6] LowerFilters de volumen
echo ---------------------------------------------------------------
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{71a27cdd-812a-11d0-bec7-08002be2092f}" /v LowerFilters 2>nul
if errorlevel 1 echo     LowerFilters no encontrado o sin valor.
echo.
echo [5/6] Hosts / bloques Lev Vigotsky
echo ---------------------------------------------------------------
findstr /i /c:"LEV_VIGOTSKY" "%SystemRoot%\System32\drivers\etc\hosts" 2>nul
if errorlevel 1 echo     No se encontraron bloques Lev Vigotsky en hosts.
echo.
echo [6/6] Chrome/Edge URLBlocklist Lev Vigotsky
echo ---------------------------------------------------------------
reg query "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" 2>nul
if errorlevel 1 echo     Chrome URLBlocklist no encontrada.
echo.
reg query "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" 2>nul
if errorlevel 1 echo     Edge URLBlocklist no encontrada.
exit /b 0

:SYSTEM_STATUS
call :UWF_STATUS
exit /b %ERRORLEVEL%

:STATUS
call :UWF_STATUS
exit /b %ERRORLEVEL%

:UWF_REPAIR_QUICK
cls
echo ================================================================
echo                  REPARAR UWF RAPIDO
echo ================================================================
echo.
echo No activa UWF. Despues de esto reinicie antes de activar UWF.
echo.
echo [1/6] Restaurando recuperacion normal de Windows...
bcdedit /deletevalue {current} bootstatuspolicy >nul 2>&1

echo [2/6] Intentando desactivar estado pendiente de UWF...
call :SET_TOOL_PATHS
if defined UWF_EXE "%UWF_EXE%" filter disable >nul 2>&1

echo [3/6] Reparando servicios UWF en control sets...
for %%C in (CurrentControlSet ControlSet001 ControlSet002 ControlSet003 ControlSet004) do (
    reg query "HKLM\SYSTEM\%%C" >nul 2>&1
    if not errorlevel 1 (
        for %%S in (uwfvol uwfs uwfreg) do (
            reg query "HKLM\SYSTEM\%%C\Services\%%S" >nul 2>&1
            if not errorlevel 1 (
                reg add "HKLM\SYSTEM\%%C\Services\%%S" /v Start /t REG_DWORD /d 0 /f >nul 2>&1
                echo     %%C\Services\%%S revisado
            )
        )
    )
)

echo [4/6] Reparando LowerFilters para incluir uwfvol...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='HKLM:\SYSTEM\CurrentControlSet\Control\Class\{71a27cdd-812a-11d0-bec7-08002be2092f}'; try { $v=(Get-ItemProperty -Path $p -Name LowerFilters -ErrorAction SilentlyContinue).LowerFilters; if($null -eq $v){$v=@()} elseif($v -is [string]){$v=@($v)}; if($v -notcontains 'uwfvol'){ $v=@($v)+@('uwfvol'); New-ItemProperty -Path $p -Name LowerFilters -PropertyType MultiString -Value $v -Force | Out-Null; Write-Host '[OK] uwfvol agregado a LowerFilters' } else { Write-Host '[OK] LowerFilters ya contiene uwfvol' } } catch { Write-Host '[!] No se pudo reparar LowerFilters' }"

echo [5/6] Asegurando caracteristica Client-UnifiedWriteFilter...
dism /online /enable-feature /featurename:Client-UnifiedWriteFilter /all /norestart

echo [6/6] Verificacion rapida...
call :SET_TOOL_PATHS
if defined UWF_EXE (
    "%UWF_EXE%" get-config
) else (
    echo [!] uwfmgr.exe aun no aparece. Use RESET UWF etapa 1 y etapa 2.
)

echo.
echo [INFO] Reinicie ahora. Luego intente uwf-enable.bat.
echo [INFO] Si sigue 0x8000FFFF, use RESET UWF ETAPA 1, reinicie, ETAPA 2, reinicie.
exit /b 0

:UWF_RESET_STAGE1
cls
echo ================================================================
echo        RESET U]QAÄ´M%9MQ1HQUI4)¡¼ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô4)¡¼¸4)¡¼UÍÍÑ¼Í¤U]Í¥Õ¹¼ÁààÀÀÁ¸4)¡¼ÍÁÕÌÍÑÑÁ	É¥¹¥¥È¸4)¡¼1Õ¼©ÕÑÕÝµÉÍÐµÍÑÈ¹Ð¸4)¡¼¸4)¡½¥½M8½¸½´½¹Ñ¥¹ÕÈümL½9tè4)¥ÉÉ½É±Ù°Èá¥Ð½Ä4(4)±°éMQ}Q==1}AQ!L4)¥¥¹U]}a 4(U]}a¥±ÑÈ¥Í±ù¹Õ°ÈøÄ4(U]}aÙ½±ÕµÕ¹ÁÉ½ÑÐèù¹Õ°ÈøÄ4(¤4)¥Ð½±ÑÙ±ÕíÕÉÉ¹Ñô½½ÑÍÑÑÕÍÁ½±¥äù¹Õ°ÈøÄ4(4)¡¼¸4)¡¼lÄ¼ÉtÍ¥¹ÍÑ±¹¼±¥¹ÐµU¹¥¥]É¥Ñ¥±ÑÈ¸¸¸4)¥Í´½½¹±¥¹½¥Í±µÑÕÉ½ÑÕÉ¹µé±¥¹ÐµU¹¥¥]É¥Ñ¥±ÑÈ½¹½ÉÍÑÉÐ4(4)¡¼¸4)¡¼lÈ¼Ét%¹Ñ¹Ñ¹¼±¥µ¥¹ÈU]ÍÝÀ¹ÍåÌÍ¤ÍÑÍ±½ÅÕ¼¸¸¸4)±°éQIe}1Q}U]}M]@4(4)¡¼¸4)¡¼m=-tÑÁÄÑÉµ¥¹¸4)¡¼I¥¹¥¥¡½É¸ÍÁÕÌ©ÕÑÕÝµÉÍÐµÍÑÈ¹Ð¸4)á¥Ð½À4(4(éU]}IMQ}MQÈ4)±Ì4)¡¼ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô4)¡¼IMPU]QAÈ´I%9MQ1HQUI4)¡¼ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô4)¡¼¸4)¡¼©ÕÑÍÑ¼MAULÉ¥¹¥¥ÈÑÉÌ±ÑÁÄ¸4)¡¼ÍÁÕÌÍÑÑÁEBE reiniciar otra vez.
echo Luego ejecute uwf-enable.bat.
echo.
choice /c SN /n /m "Continuar? [S/N]: "
if errorlevel 2 exit /b 1

bcdedit /deletevalue {current} bootstatuspolicy >nul 2>&1

echo.
echo [1/3] Reinstalando Client-UnifiedWriteFilter...
dism /online /enable-feature /featurename:Client-UnifiedWriteFilter /all /norestart
if errorlevel 1 (
    echo [!] DISM fallo al reinstalar UWF.
    exit /b 1
)

echo.
echo [2/3] Reparando LowerFilters...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='HKLM:\SYSTEM\CurrentControlSet\Control\Class\{71a27cdd-812a-11d0-bec7-08002be2092f}'; try { $v=(Get-ItemProperty -Path $p -Name LowerFilters -ErrorAction SilentlyContinue).LowerFilters; if($null -eq $v){$v=@()} elseif($v -is [string]){$v=@($v)}; if($v -notcontains 'uwfvol'){ $v=@($v)+@('uwfvol'); New-ItemProperty -Path $p -Name LowerFilters -PropertyType MultiString -Value $v -Force | Out-Null } } catch { }"

echo.
echo [3/3] Eliminando UWFswap.sys viejo si aun existe...
call :TRY_DELETE_UWF_SWAP

echo.
echo [OK] Etapa 2 terminada.
echo Reinicie ahora. Despues ejecute uwf-enable.bat.
exit /b 0

rem ============================================================================
rem CLEANUP - SEPARATE ONLY
rem ============================================================================

:CLEANUP_ONLY
cls
echo ================================================================
echo          LIMPIEZA DE HISTORIAL, CARPETAS Y PAPELERA
echo ================================================================
echo.
echo [1/3] Cerrando navegadores...
call :CLOSE_BROWSERS
echo [2/3] Limpiando perfiles de usuario...
call :CLEAN_ALL_USER_PROFILES
echo [3/3] Vaciando papelera de reciclaje...
call :EMPTY_RECYCLE_BIN
echo.
echo [OK] Limpieza terminada.
echo [INFO] Si UWF esta activo, estos cambios se perderan al reiniciar.
exit /b 0

:CLOSE_BROWSERS
for %%P in (chrome.exe msedge.exe firefox.exe iexplore.exe opera.exe brave.exe) do taskkill /f /im "%%P" >nul 2>&1
exit /b 0

:CLEAN_ALL_USER_PROFILES
set "USERS_ROOT=%SystemDrive%\Users"
if not exist "%USERS_ROOT%" exit /b 0
for /d %%U in ("%USERS_ROOT%\*") do call :CLEAN_ONE_USER_PROFILE "%%~fU"
exit /b 0

:CLEAN_ONE_USER_PROFILE
set "USER_PROFILE_PATH=%~1"
set "PROFILE_NAME=%~nx1"

if /I "%PROFILE_NAME%"=="All Users" exit /b 0
if /I "%PROFILE_NAME%"=="Default