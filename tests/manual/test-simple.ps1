# Script de Pruebas Simple - FormBuilder Backend
param([string]$BaseUrl = "http://localhost:3000")

$ErrorActionPreference = "Stop"

Write-Host "🧪 INICIANDO PRUEBAS DEL BACKEND" -ForegroundColor Cyan
Write-Host "URL: $BaseUrl`n" -ForegroundColor Gray

# Función para hacer requests
function Test-Endpoint($method, $path, $body, $token, $expectedStatus) {
    $uri = "$BaseUrl$path"
    $headers = @{}
    if ($token) { $headers['x-auth-token'] = $token }
    
    try {
        $params = @{ Uri = $uri; Method = $method; Headers = $headers }
        if ($body) { $params.Body = ($body | ConvertTo-Json); $params.ContentType = 'application/json' }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Status = 200; Data = $response }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        return @{ Success = ($status -eq $expectedStatus); Status = $status; Error = $_.Exception.Message }
    }
}

# Contadores
$passed = 0
$failed = 0

function Test-Case($name, $result) {
    if ($result.Success) {
        Write-Host "✅ $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "❌ $name - Status: $($result.Status)" -ForegroundColor Red
        if ($result.Error) { Write-Host "   Error: $($result.Error)" -ForegroundColor DarkRed }
        $script:failed++
    }
}

Write-Host "`n🔒 PRUEBAS DE SEGURIDAD" -ForegroundColor Yellow

# Test 1: Acceso sin token
$result = Test-Endpoint -method "GET" -path "/api/formularios" -expectedStatus 401
Test-Case "Rechaza acceso sin token (401)" $result

# Test 2: Token inválido
$result = Test-Endpoint -method "GET" -path "/api/formularios" -token "fake-token" -expectedStatus 401
Test-Case "Rechaza token inválido (401)" $result

# Test 3: Ruta inexistente
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/ruta-inexistente" -Method GET -ErrorAction Stop
    $result = @{ Success = $false }
} catch {
    $result = @{ Success = ($_.Exception.Response.StatusCode.value__ -eq 404) }
}
Test-Case "Ruta inexistente retorna 404" $result

Write-Host "`n👤 PRUEBAS DE AUTENTICACIÓN" -ForegroundColor Yellow

# Test 4: Login sin credenciales
$result = Test-Endpoint -method "POST" -path "/api/auth/login" -body @{email=""; password=""} -expectedStatus 400
Test-Case "Login sin credenciales retorna 400" $result

# Test 5: Login con credenciales inválidas
$result = Test-Endpoint -method "POST" -path "/api/auth/login" -body @{email="test@test.com"; password="wrong"} -expectedStatus 400
Test-Case "Login con credenciales inválidas retorna 400" $result

Write-Host "`n📝 PRUEBAS DE FORMULARIOS (Protegidas)" -ForegroundColor Yellow

# Test 6: Crear formulario sin token
$result = Test-Endpoint -method "POST" -path "/api/formularios" -body @{titulo="Test"; campos=@(@{label="Test"; tipo="text"})} -expectedStatus 401
Test-Case "Crear formulario sin token retorna 401" $result

# Test 7: Actualizar formulario sin token
$result = Test-Endpoint -method "PUT" -path "/api/formularios/123" -body @{titulo="Test"; campos=@()} -expectedStatus 401
Test-Case "Actualizar formulario sin token retorna 401" $result

# Test 8: Eliminar formulario sin token
$result = Test-Endpoint -method "DELETE" -path "/api/formularios/123" -expectedStatus 401
Test-Case "Eliminar formulario sin token retorna 401" $result

Write-Host "`n📊 RESUMEN" -ForegroundColor Yellow
$total = $passed + $failed
Write-Host "Total: $total | ✅ Pasaron: $passed | ❌ Fallaron: $failed" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`n🎉 TODAS LAS PRUEBAS PASARON" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  ALGUNAS PRUEBAS FALLARON" -ForegroundColor Yellow
    exit 1
}
