# FormBuilder Backend Full Integration Tests
param([string]$BaseUrl = "http://localhost:3000")

$ErrorActionPreference = "Continue"
$script:passed = 0
$script:failed = 0
$script:testUser = $null
$script:authToken = $null
$script:testFormId = $null

$testEmail = "test-$(Get-Random)@test.com"
$testPass = "TestPass123!"
$testEmpresa = "TestEmpresa-$(Get-Random)"

function Write-TestHeader($title) {
    Write-Host "`n--- $title ---" -ForegroundColor Yellow
}

function Test-Case($name, $condition, $details) {
    if ($condition) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        if ($details) { Write-Host "       Details: $details" -ForegroundColor DarkRed }
        $script:failed++
    }
}

function Invoke-Api($method, $path, $body, $token) {
    $uri = "$BaseUrl$path"
    $headers = @{}
    if ($token) { $headers['x-auth-token'] = $token }
    
    try {
        $params = @{ Uri = $uri; Method = $method }
        if ($headers.Count -gt 0) { $params.Headers = $headers }
        if ($body) { 
            $params.Body = ($body | ConvertTo-Json -Depth 10)
            $params.ContentType = 'application/json'
        }
        $response = Invoke-RestMethod @params -ErrorAction Stop
        return @{ Success = $true; Status = 200; Data = $response }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        try {
            $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
        } catch { $errorData = $null }
        return @{ Success = $false; Status = $status; Error = $_.Exception.Message; ErrorData = $errorData }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FULL INTEGRATION TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Email: $testEmail" -ForegroundColor Gray
Write-Host "Empresa: $testEmpresa" -ForegroundColor Gray
Write-Host "URL: $BaseUrl`n" -ForegroundColor Gray

# 1. REGISTRO
Write-TestHeader "USER REGISTRATION"
$registerBody = @{
    nombre = "Test User"
    email = $testEmail
    password = $testPass
    rol = "gerente"
    empresaId = $testEmpresa
}
$r = Invoke-Api -method "POST" -path "/api/auth/register" -body $registerBody
Test-Case "Register new user" ($r.Success -and $r.Data.user.id) "Status: $($r.Status)"
if ($r.Success) { $script:testUser = $r.Data.user }

# 2. LOGIN
Write-TestHeader "AUTHENTICATION"
$loginBody = @{
    email = $testEmail
    password = $testPass
}
$r = Invoke-Api -method "POST" -path "/api/auth/login" -body $loginBody
Test-Case "Login with valid credentials" ($r.Success -and $r.Data.token) "Status: $($r.Status)"
if ($r.Success) { 
    $script:authToken = $r.Data.token 
    Write-Host "       Token obtained: $($script:authToken.Substring(0,30))..." -ForegroundColor DarkGray
}

# 3. CREAR FORMULARIO
Write-TestHeader "FORM CRUD - CREATE"
if ($script:authToken) {
    $formBody = @{
        titulo = "Formulario de Prueba $(Get-Random)"
        campos = @(
            @{ label = "Nombre"; tipo = "text"; requerido = $true },
            @{ label = "Edad"; tipo = "number"; requerido = $false },
            @{ 
                label = "Evaluacion"; 
                tipo = "cuadricula_unica"; 
                requerido = $true;
                filas = @("Puntualidad", "Calidad");
                columnas = @("Malo", "Regular", "Bueno")
            }
        )
    }
    $r = Invoke-Api -method "POST" -path "/api/formularios" -body $formBody -token $script:authToken
    Test-Case "Create form with valid data" ($r.Success -and $r.Data.data._id) "Status: $($r.Status)"
    if ($r.Success) { 
        $script:testFormId = $r.Data.data._id
        Write-Host "       Form ID: $($script:testFormId)" -ForegroundColor DarkGray
    }
} else {
    Test-Case "Create form - SKIPPED (no token)" $false
}

# 4. LISTAR FORMULARIOS
Write-TestHeader "FORM CRUD - LIST"
if ($script:authToken) {
    $r = Invoke-Api -method "GET" -path "/api/formularios" -token $script:authToken
    $hasForms = ($r.Success -and $r.Data.Count -gt 0)
    Test-Case "List forms from company" $hasForms "Count: $($r.Data.Count)"
} else {
    Test-Case "List forms - SKIPPED (no token)" $false
}

# 5. OBTENER FORMULARIO POR ID
Write-TestHeader "FORM CRUD - GET BY ID"
if ($script:authToken -and $script:testFormId) {
    $r = Invoke-Api -method "GET" -path "/api/formularios/$($script:testFormId)" -token $script:authToken
    Test-Case "Get form by ID" ($r.Success -and $r.Data._id -eq $script:testFormId) "Status: $($r.Status)"
} else {
    Test-Case "Get form by ID - SKIPPED" $false
}

# 6. VALIDACIONES
Write-TestHeader "VALIDATIONS"
if ($script:authToken) {
    # Sin titulo
    $r = Invoke-Api -method "POST" -path "/api/formularios" -body @{titulo=""; campos=@(@{label="T";tipo="text"})} -token $script:authToken
    Test-Case "Reject form without title" ($r.Status -eq 400) "Status: $($r.Status)"
    
    # Sin campos
    $r = Invoke-Api -method "POST" -path "/api/formularios" -body @{titulo="Test"; campos=@()} -token $script:authToken
    Test-Case "Reject form without fields" ($r.Status -eq 400) "Status: $($r.Status)"
    
    # Campos nulos
    $r = Invoke-Api -method "POST" -path "/api/formularios" -body @{titulo="Test"} -token $script:authToken
    Test-Case "Reject form with null fields" ($r.Status -eq 400) "Status: $($r.Status)"
} else {
    Test-Case "Validations - SKIPPED (no token)" $false
}

# 7. PERFIL
Write-TestHeader "USER PROFILE"
if ($script:authToken) {
    $r = Invoke-Api -method "GET" -path "/api/usuarios/perfil" -token $script:authToken
    Test-Case "Get user profile" ($r.Success -and $r.Data.email -eq $testEmail) "Status: $($r.Status)"
    
    $updateBody = @{
        nombre = "Updated Name"
        dni = "12345678"
        telefono = "+1234567890"
    }
    $r = Invoke-Api -method "PUT" -path "/api/usuarios/perfil" -body $updateBody -token $script:authToken
    Test-Case "Update user profile" $r.Success "Status: $($r.Status)"
} else {
    Test-Case "Profile tests - SKIPPED (no token)" $false
}

# 8. SEGURIDAD - OTROS USUARIOS
Write-TestHeader "SECURITY - CROSS-COMPANY ACCESS"
if ($script:testFormId) {
    # Crear otro usuario de otra empresa
    $otherEmail = "other-$(Get-Random)@test.com"
    $otherEmpresa = "OtherEmpresa-$(Get-Random)"
    
    $otherUser = @{
        nombre = "Other User"
        email = $otherEmail
        password = $testPass
        rol = "gerente"
        empresaId = $otherEmpresa
    }
    Invoke-Api -method "POST" -path "/api/auth/register" -body $otherUser | Out-Null
    
    $otherLogin = Invoke-Api -method "POST" -path "/api/auth/login" -body @{email=$otherEmail; password=$testPass}
    if ($otherLogin.Success) {
        $otherToken = $otherLogin.Data.token
        # Intentar acceder al formulario de la primera empresa
        $r = Invoke-Api -method "GET" -path "/api/formularios/$($script:testFormId)" -token $otherToken
        Test-Case "Block cross-company access" ($r.Status -eq 404) "Status: $($r.Status)"
    } else {
        Test-Case "Block cross-company access - setup failed" $false
    }
} else {
    Test-Case "Cross-company test - SKIPPED (no form)" $false
}

# 9. ACTUALIZAR FORMULARIO
Write-TestHeader "FORM CRUD - UPDATE"
if ($script:authToken -and $script:testFormId) {
    $updateBody = @{
        titulo = "Updated Title $(Get-Random)"
        campos = @(@{label = "Updated Field"; tipo = "text"; requerido = $true})
    }
    $r = Invoke-Api -method "PUT" -path "/api/formularios/$($script:testFormId)" -body $updateBody -token $script:authToken
    Test-Case "Update form" $r.Success "Status: $($r.Status)"
} else {
    Test-Case "Update form - SKIPPED" $false
}

# 10. ELIMINAR FORMULARIO
Write-TestHeader "FORM CRUD - DELETE"
if ($script:authToken -and $script:testFormId) {
    $r = Invoke-Api -method "DELETE" -path "/api/formularios/$($script:testFormId)" -token $script:authToken
    Test-Case "Delete form" $r.Success "Status: $($r.Status)"
    
    # Verificar que ya no existe
    $r = Invoke-Api -method "GET" -path "/api/formularios/$($script:testFormId)" -token $script:authToken
    Test-Case "Form no longer exists after delete" ($r.Status -eq 404) "Status: $($r.Status)"
} else {
    Test-Case "Delete form - SKIPPED" $false
}

# RESULTADOS
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$total = $script:passed + $script:failed
Write-Host "Total: $total | Passed: $script:passed | Failed: $script:failed" -ForegroundColor White

if ($script:failed -eq 0) {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
} else {
    $rate = [math]::Round(($script:passed / $total) * 100, 1)
    Write-Host "`nSuccess rate: $rate%" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan

exit $script:failed
