# =====================================================================
# instalar.ps1 — SCALL (my-skills)
# Mueve archivos entregados por Claude desde la carpeta de Descargas
# hasta su ubicación correcta dentro del repo, en un solo paso.
#
# Uso (una vez por sesión de terminal):
#   . .\instalar.ps1
#
# Luego, por cada archivo que Claude entregue:
#   Instalar-ArchivoSCALL -NombreArchivo "app.js" -Destino "$base\docs\js\app.js"
# =====================================================================

function Instalar-ArchivoSCALL {
    param(
        [Parameter(Mandatory)] [string]$NombreArchivo,
        [Parameter(Mandatory)] [string]$Destino,
        [string]$Origen = "C:\Descargas"
    )
    $rutaOrigen = Join-Path $Origen $NombreArchivo

    if (-not (Test-Path $rutaOrigen)) {
        Write-Host "❌ No encontré $rutaOrigen" -ForegroundColor Red
        return
    }

    $carpetaDestino = Split-Path $Destino -Parent
    if (-not (Test-Path $carpetaDestino)) {
        New-Item -ItemType Directory -Force -Path $carpetaDestino | Out-Null
    }

    Move-Item $rutaOrigen $Destino -Force
    Write-Host "✅ $NombreArchivo → movido a $Destino" -ForegroundColor Green
}

Write-Host "Instalar-ArchivoSCALL cargada. Ejemplo de uso:" -ForegroundColor Cyan
Write-Host '  $base = "C:\Users\User01\OneDrive\2026-proyectos\my-skills"' -ForegroundColor DarkGray
Write-Host '  Instalar-ArchivoSCALL -NombreArchivo "app.js" -Destino "$base\docs\js\app.js"' -ForegroundColor DarkGray
