@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: =====================================================================
:: SCALL — Deploy automático
:: Copia archivos de Descargas al repo, hace commit y los borra
:: =====================================================================

set REPO=C:\Users\User01\OneDrive\2026-proyectos\my-skills
set DOWN=%USERPROFILE%\Downloads
set DOCS=%REPO%\docs

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   SCALL — Deploy automático v1.0    ║
echo  ╚══════════════════════════════════════╝
echo.

:: Verificar que el repo existe
if not exist "%REPO%" (
    echo [ERROR] No se encontro el repo en: %REPO%
    pause & exit /b 1
)

cd /d "%REPO%"

:: ── Mapa de archivos: origen → destino ────────────────────────────────
set COUNT=0

call :copiar "index.html"          "%DOCS%\index.html"
call :copiar "styles.css"          "%DOCS%\css\styles.css"
call :copiar "app.js"              "%DOCS%\js\app.js"
call :copiar "alarms.js"           "%DOCS%\js\alarms.js"
call :copiar "rutas.js"            "%DOCS%\js\rutas.js"
call :copiar "intents_alarmas.js"  "%DOCS%\js\intents_alarmas.js"
call :copiar "intents_rutas.js"    "%DOCS%\js\intents_rutas.js"
call :copiar "bluetooth.js"        "%DOCS%\js\bluetooth.js"
call :copiar "claude_tools.js"     "%DOCS%\js\claude_tools.js"
call :copiar "sismos.js"           "%DOCS%\js\sismos.js"
call :copiar "colombia.js"         "%DOCS%\js\colombia.js"
call :copiar "tts_elevenlabs.js"   "%DOCS%\js\tts_elevenlabs.js"
call :copiar "cumpleanos.js"       "%DOCS%\js\cumpleanos.js"
call :copiar "skills.js"           "%DOCS%\js\skills.js"
call :copiar "ui.js"               "%DOCS%\js\ui.js"
call :copiar "config.js"           "%DOCS%\js\config.js"
call :copiar "spotify.js"          "%DOCS%\js\spotify.js"
call :copiar "radio.js"            "%DOCS%\js\radio.js"
call :copiar "sos.js"              "%DOCS%\js\sos.js"

if %COUNT%==0 (
    echo  [INFO] No hay archivos nuevos en Descargas.
    echo.
    pause & exit /b 0
)

echo.
echo  ── %COUNT% archivo(s) copiado(s) ──
echo.

:: ── Git ───────────────────────────────────────────────────────────────
echo  [GIT] Agregando cambios...
git add docs/

set /p MSG= Mensaje del commit (Enter = 'update: deploy automatico'): 
if "!MSG!"=="" set MSG=update: deploy automatico

git commit -m "!MSG!"
if errorlevel 1 (
    echo  [INFO] Sin cambios nuevos para commitear.
) else (
    echo  [GIT] Subiendo al repo...
    git push
    if errorlevel 1 (
        echo  [ERROR] Fallo el push. Verifica tu conexion.
    ) else (
        echo  [OK] Push exitoso ^^ SCALL actualizado en GitHub Pages
    )
)

echo.
echo  ══════════════════════════════════════════
echo   Deploy completado — %COUNT% archivo(s)
echo  ══════════════════════════════════════════
echo.
pause
exit /b 0

:: ── Función copiar ────────────────────────────────────────────────────
:copiar
set ARCHIVO=%~1
set DESTINO=%~2
set ORIGEN=%DOWN%\%ARCHIVO%

if exist "!ORIGEN!" (
    :: Crear carpeta destino si no existe
    for %%D in ("!DESTINO!") do (
        if not exist "%%~dpD" mkdir "%%~dpD"
    )
    copy /y "!ORIGEN!" "!DESTINO!" >nul
    del "!ORIGEN!"
    echo  [OK] !ARCHIVO! → copiado y borrado de Descargas
    set /a COUNT+=1
) else (
    echo  [--] !ARCHIVO! no encontrado en Descargas
)
exit /b 0
