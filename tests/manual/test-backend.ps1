# Script de Pruebas Exhaustivas - FormBuilder Backend
# Autor: Cascade AI - FormBuilder Backend Testing Suite

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$TestEmail = "test-$(Get-Random)@empresa.com",
    [string]$TestPassword = "TestPassword123!",
    [string]$TestEmpresa = "Empresa-Test-$(Get-Random)"
)

$ErrorActionPreference = "Continue"
$global:TestResults = @()
$global:PassedTests = 0
$global:FailedTests = 0
$global:AuthToken = $null
$global:TestUserId = $null
$global:TestFormId = $null
$global:TestResponseId = $null

# Funciones de utilidad
function Write-TestHeader($text) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "✅ $text" -ForegroundColor Green
    $global:PassedTests++
    $global:TestResults += [PSCustomObject]@{ Test = $text; Status = "PASSED"; Timestamp = Get-Date }
}

function Write-Failure($text, $error) {
    Write-Host "❌ $text" -ForegroundColor Red
    Write-Host "   Error: $error" -ForegroundColor Red
    $global:FailedTests++
    $global:TestResults += [PSCustomObject]@{ Test = $text; Status = "FAILED"; Error = $error; Timestamp = Get-Date }
}

function Invoke-ApiRequest($method, $endpoint, $body = $null, $headers = @{}, $contentType = "application/json") {
    $url = "$BaseUrl$endpoint"
    $params = @{
        Uri = $url
        Method = $method
        Headers = $headers
        ContentType = $contentType
    }
    if ($body) {
        $params.Body = $body
    }
    
    try {
        $response = Invoke-RestMethod @params -ErrorAction Stop
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorMessage = $errorBody.msg
        } catch {}
        return @{ Success = $false; Error = $errorMessage; StatusCode = $statusCode; RawError = $_ }
    }
}

# ==========================================
# TEST 1: Verificar servidor está corriendo
# ==========================================
Write-TestHeader "TEST 1: Verificar Servidor"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/formularios" -Method GET -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Success "Servidor corriendo y protegiendo rutas (401)"
    } else {
        Write-Failure "Servidor no responde correctamente" $_.Exception.Message
        exit 1
    }
}

# ==========================================
# TEST 2: Registro de usuario
# ==========================================
Write-TestHeader "TEST 2: Registro de Usuario"
$registerBody = @{
    nombre = "Usuario Test"
    email = $TestEmail
    password = $TestPassword
    rol = "gerente"
    empresaId = $TestEmpresa
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/auth/register" -body $registerBody
if ($result.Success) {
    Write-Success "Usuario registrado exitosamente"
    $global:TestUserId = $result.Data.user.id
} else {
    Write-Failure "Registro de usuario" $result.Error
}

# ==========================================
# TEST 3: Login con credenciales válidas
# ==========================================
Write-TestHeader "TEST 3: Login Exitoso"
$loginBody = @{
    email = $TestEmail
    password = $TestPassword
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/auth/login" -body $loginBody
if ($result.Success -and $result.Data.token) {
    $global:AuthToken = $result.Data.token
    Write-Success "Login exitoso - Token obtenido"
} else {
    Write-Failure "Login" $result.Error
}

# ==========================================
# TEST 4: Login con credenciales inválidas
# ==========================================
Write-TestHeader "TEST 4: Login con Credenciales Inválidas"
$invalidLoginBody = @{
    email = $TestEmail
    password = "wrongpassword"
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/auth/login" -body $invalidLoginBody
if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-Success "Login rechaza credenciales inválidas (400)"
} else {
    Write-Failure "Login inválido debería retornar 400" $result.Error
}

# ==========================================
# TEST 5: Acceso sin token
# ==========================================
Write-TestHeader "TEST 5: Acceso sin Token"
$result = Invoke-ApiRequest -method "GET" -endpoint "/api/formularios"
if (-not $result.Success -and $result.StatusCode -eq 401) {
    Write-Success "Rutas protegidas requieren token (401)"
} else {
    Write-Failure "Debería requerir token" $result.Error
}

# ==========================================
# TEST 6: Crear formulario
# ==========================================
Write-TestHeader "TEST 6: Crear Formulario"
$formBody = @{
    titulo = "Formulario de Prueba $(Get-Random)"
    campos = @(
        @{
            label = "Nombre del empleado"
            tipo = "text"
            requerido = $true
        },
        @{
            label = "Calificación"
            tipo = "cuadricula_unica"
            requerido = $true
            filas = @("Puntualidad", "Asistencia", "Productividad")
            columnas = @("Malo", "Regular", "Bueno", "Excelente")
        },
        @{
            label = "Fotos"
            tipo = "file"
            requerido = $false
        }
    )
} | ConvertTo-Json -Depth 10

$headers = @{
    "x-auth-token" = $global:AuthToken
}

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/formularios" -body $formBody -headers $headers
if ($result.Success -and $result.Data.data._id) {
    $global:TestFormId = $result.Data.data._id
    Write-Success "Formulario creado con ID: $($global:TestFormId)"
} else {
    Write-Failure "Crear formulario" $result.Error
}

# ==========================================
# TEST 7: Obtener formularios de la empresa
# ==========================================
Write-TestHeader "TEST 7: Listar Formularios"
$result = Invoke-ApiRequest -method "GET" -endpoint "/api/formularios" -headers $headers
if ($result.Success -and $result.Data.Count -gt 0) {
    Write-Success "Lista de formularios obtenida ($($result.Data.Count) formularios)"
} else {
    Write-Failure "Listar formularios" $result.Error
}

# ==========================================
# TEST 8: Obtener formulario por ID
# ==========================================
Write-TestHeader "TEST 8: Obtener Formulario por ID"
if ($global:TestFormId) {
    $result = Invoke-ApiRequest -method "GET" -endpoint "/api/formularios/$($global:TestFormId)" -headers $headers
    if ($result.Success -and $result.Data._id -eq $global:TestFormId) {
        Write-Success "Formulario obtenido por ID"
    } else {
        Write-Failure "Obtener formulario por ID" $result.Error
    }
} else {
    Write-Failure "Obtener formulario por ID" "No hay formulario de prueba"
}

# ==========================================
# TEST 9: Actualizar formulario
# ==========================================
Write-TestHeader "TEST 9: Actualizar Formulario"
if ($global:TestFormId) {
    $updateBody = @{
        titulo = "Formulario Actualizado $(Get-Random)"
        campos = @(
            @{
                label = "Nombre del empleado"
                tipo = "text"
                requerido = $true
            },
            @{
                label = "Comentarios"
                tipo = "textarea"
                requerido = $false
            }
        )
    } | ConvertTo-Json -Depth 10

    $result = Invoke-ApiRequest -method "PUT" -endpoint "/api/formularios/$($global:TestFormId)" -body $updateBody -headers $headers
    if ($result.Success) {
        Write-Success "Formulario actualizado"
    } else {
        Write-Failure "Actualizar formulario" $result.Error
    }
} else {
    Write-Failure "Actualizar formulario" "No hay formulario de prueba"
}

# ==========================================
# TEST 10: Crear formulario sin título (validación)
# ==========================================
Write-TestHeader "TEST 10: Validación - Formulario sin Título"
$invalidFormBody = @{
    titulo = ""
    campos = @(@{ label = "Campo"; tipo = "text"; requerido = $true })
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/formularios" -body $invalidFormBody -headers $headers
if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-Success "Validación rechaza formulario sin título (400)"
} else {
    Write-Failure "Validación título" $result.Error
}

# ==========================================
# TEST 11: Crear formulario sin campos (validación)
# ==========================================
Write-TestHeader "TEST 11: Validación - Formulario sin Campos"
$invalidFormBody2 = @{
    titulo = "Formulario inválido"
    campos = @()
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "POST" -endpoint "/api/formularios" -body $invalidFormBody2 -headers $headers
if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-Success "Validación rechaza formulario sin campos (400)"
} else {
    Write-Failure "Validación campos" $result.Error
}

# ==========================================
# TEST 12: Obtener perfil de usuario
# ==========================================
Write-TestHeader "TEST 12: Obtener Perfil de Usuario"
$result = Invoke-ApiRequest -method "GET" -endpoint "/api/usuarios/perfil" -headers $headers
if ($result.Success -and $result.Data.email -eq $TestEmail) {
    Write-Success "Perfil de usuario obtenido"
} else {
    Write-Failure "Obtener perfil" $result.Error
}

# ==========================================
# TEST 13: Actualizar perfil
# ==========================================
Write-TestHeader "TEST 13: Actualizar Perfil"
$profileUpdateBody = @{
    nombre = "Usuario Actualizado"
    dni = "12345678"
    telefono = "+1234567890"
} | ConvertTo-Json -Depth 10

$result = Invoke-ApiRequest -method "PUT" -endpoint "/api/usuarios/perfil" -body $profileUpdateBody -headers $headers
if ($result.Success) {
    Write-Success "Perfil actualizado"
} else {
    Write-Failure "Actualizar perfil" $result.Error
}

# ==========================================
# TEST 14: Intentar acceder a formulario de otra empresa
# ==========================================
Write-TestHeader "TEST 14: Seguridad - Aislamiento de Empresas"

# Crear usuario de otra empresa
$otherEmail = "other-$(Get-Random)@empresa.com"
$otherEmpresa = "Otra-Empresa-$(Get-Random)"
$registerOtherBody = @{
    nombre = "Usuario Otra Empresa"
    email = $otherEmail
    password = $TestPassword
    rol = "gerente"
    empresaId = $otherEmpresa
} | ConvertTo-Json -Depth 10

Invoke-ApiRequest -method "POST" -endpoint "/api/auth/register" -body $registerOtherBody | Out-Null

$loginOtherBody = @{
    email = $otherEmail
    password = $TestPassword
} | ConvertTo-Json -Depth 10

$otherLoginResult = Invoke-ApiRequest -method "POST" -endpoint "/api/auth/login" -body $loginOtherBody
if ($otherLoginResult.Success) {
    $otherHeaders = @{
        "x-auth-token" = $otherLoginResult.Data.token
    }

    # Intentar acceder al formulario de la primera empresa
    $result = Invoke-ApiRequest -method "GET" -endpoint "/api/formularios/$($global:TestFormId)" -headers $otherHeaders
    if (-not $result.Success -and $result.StatusCode -eq 404) {
        Write-Success "Aislamiento de empresas funciona (404 para acceso cruzado)"
    } else {
        Write-Failure "Aislamiento de empresas" "Debería retornar 404"
    }
} else {
    Write-Failure "Aislamiento de empresas" "No se pudo crear usuario de otra empresa"
}

# ==========================================
# TEST 15: Token inválido
# ==========================================
Write-TestHeader "TEST 15: Seguridad - Token Inválido"
$invalidHeaders = @{
    "x-auth-token" = "token-invalido-falso"
}

$result = Invoke-ApiRequest -method "GET" -endpoint "/api/formularios" -headers $invalidHeaders
if (-not $result.Success -and $result.StatusCode -eq 401) {
    Write-Success "Token inválido rechazado (401)"
} else {
    Write-Failure "Token inválido" $result.Error
}

# ==========================================
# TEST 16: Eliminar formulario
# ==========================================
Write-TestHeader "TEST 16: Eliminar Formulario"
if ($global:TestFormId) {
    $result = Invoke-ApiRequest -method "DELETE" -endpoint "/api/formularios/$($global:TestFormId)" -headers $headers
    if ($result.Success -or $result.StatusCode -eq 200) {
        Write-Success "Formulario eliminado"
    } else {
        Write-Failure "Eliminar formulario" $result.Error
    }
} else {
    Write-Failure "Eliminar formulario" "No hay formulario de prueba"
}

# ==========================================
# TEST 17: Verificar CORS headers
# ==========================================
Write-TestHeader "TEST 17: Verificar CORS Headers"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/formularios" -Method GET -ErrorAction Stop
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Success "CORS headers presentes"
    } else {
        Write-Failure "CORS" "Headers no encontrados"
    }
} catch {
    # El error 401 es esperado, solo verificamos headers
    if ($_.Exception.Response.Headers["Access-Control-Allow-Origin"]) {
        Write-Success "CORS headers presentes en respuesta de error"
    } else {
        Write-Failure "CORS" "Headers no encontrados"
    }
}

# ==========================================
# REPORTE FINAL
# ==========================================
Write-TestHeader "REPORTE FINAL DE PRUEBAS"

$totalTests = $global:PassedTests + $global:FailedTests
$successRate = if ($totalTests -gt 0) { [math]::Round(($global:PassedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "`n📊 ESTADÍSTICAS:" -ForegroundColor Yellow
Write-Host "   Total de pruebas: $totalTests" -ForegroundColor White
Write-Host "   ✅ Aprobadas: $global:PassedTests" -ForegroundColor Green
Write-Host "   ❌ Fallidas: $global:FailedTests" -ForegroundColor Red
Write-Host "   📈 Tasa de éxito: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

Write-Host "`n📋 DETALLE DE PRUEBAS:" -ForegroundColor Yellow
foreach ($result in $global:TestResults) {
    $color = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
    Write-Host "   [$($result.Status)] $($result.Test)" -ForegroundColor $color
    if ($result.Error) {
        Write-Host "         Error: $($result.Error)" -ForegroundColor Red
    }

    # ==========================================
    # TEST 17: Verificar CORS headers
    # ==========================================
    Write-TestHeader "TEST 17: Verificar CORS Headers"
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/formularios" -Method GET -ErrorAction Stop
        $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
        if ($corsHeader) {
            Write-Success "CORS headers presentes"
        } else {
            Write-Failure "CORS" "Headers no encontrados"
        }
    } catch {
        # El error 401 es esperado, solo verificamos headers
        if ($_.Exception.Response.Headers["Access-Control-Allow-Origin"]) {
            Write-Success "CORS headers presentes en respuesta de error"
        } else {
            Write-Failure "CORS" "Headers no encontrados"
        }
    }

    # ==========================================
    # REPORTE FINAL
    # ==========================================
    Write-TestHeader "REPORTE FINAL DE PRUEBAS"

    $totalTests = $global:PassedTests + $global:FailedTests
    $successRate = if ($totalTests -gt 0) { [math]::Round(($global:PassedTests / $totalTests) * 100, 2) } else { 0 }

    Write-Host "`n📊 ESTADÍSTICAS:" -ForegroundColor Yellow
    Write-Host "   Total de pruebas: $totalTests" -ForegroundColor White
    Write-Host "   ✅ Aprobadas: $global:PassedTests" -ForegroundColor Green
    Write-Host "   ❌ Fallidas: $global:FailedTests" -ForegroundColor Red
    Write-Host "   📈 Tasa de éxito: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

    Write-Host "`n📋 DETALLE DE PRUEBAS:" -ForegroundColor Yellow
    foreach ($result in $global:TestResults) {
        $color = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
        Write-Host "   [$($result.Status)] $($result.Test)" -ForegroundColor $color
        if ($result.Error) {
            Write-Host "         Error: $($result.Error)" -ForegroundColor Red
        }
    }

    # Guardar reporte en archivo
    $reportPath = ".\tests\manual\test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"

    # Construir el contenido del reporte línea por línea
    $reportLines = @()
    $reportLines += "========================================"
    $reportLines += "REPORTE DE PRUEBAS - FORMBUILDER BACKEND"
    $reportLines += "========================================"
    $reportLines += "Fecha: $(Get-Date)"
    $reportLines += "Base URL: $BaseUrl"
    $reportLines += "Usuario de prueba: $TestEmail"
    $reportLines += "Empresa de prueba: $TestEmpresa"
    $reportLines += ""
    $reportLines += "ESTADÍSTICAS:"
    $reportLines += "Total de pruebas: $totalTests"
    $reportLines += "Aprobadas: $global:PassedTests"
    $reportLines += "Fallidas: $global:FailedTests"
    $reportLines += "Tasa de éxito: $successRate%"
    $reportLines += ""
    $reportLines += "DETALLE DE PRUEBAS:"

    foreach ($testResult in $global:TestResults) {
        $line = "[$($testResult.Status)] $($testResult.Test)"
        if ($testResult.Error) {
            $line += " - Error: $($testResult.Error)"
        }
        $reportLines += $line
    }

    $reportContent = $reportLines -join "`n"
    $reportContent | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "`n📝 Reporte guardado en: $reportPath" -ForegroundColor Cyan

    # Retornar código de salida
    if ($global:FailedTests -gt 0) {
        Write-Host "`n⚠️  Algunas pruebas fallaron. Revisar reporte." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "`n🎉 Todas las pruebas pasaron exitosamente!" -ForegroundColor Green
        exit 0
    }
    exit 1
} else {
    Write-Host "`n🎉 Todas las pruebas pasaron exitosamente!" -ForegroundColor Green
    exit 0
}
