# FormBuilder Backend API Tests
param([string]$BaseUrl = "http://localhost:3000")

$ErrorActionPreference = "Continue"
$passed = 0
$failed = 0

function Test-Case($name, $success, $details) {
    if ($success) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        if ($details) { Write-Host "       $details" -ForegroundColor DarkRed }
        $script:failed++
    }
}

function Invoke-Test($method, $path, $body, $token) {
    $uri = "$BaseUrl$path"
    $headers = @{}
    if ($token) { $headers['x-auth-token'] = $token }
    
    try {
        $params = @{ Uri = $uri; Method = $method }
        if ($headers.Count -gt 0) { $params.Headers = $headers }
        if ($body) { 
            $params.Body = ($body | ConvertTo-Json)
            $params.ContentType = 'application/json'
        }
        $response = Invoke-RestMethod @params -ErrorAction Stop
        return @{ Success = $true; Status = 200; Data = $response }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        return @{ Success = $false; Status = $status; Error = $_.Exception.Message }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FORMBUILDER BACKEND API TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "URL: $BaseUrl`n" -ForegroundColor Gray

Write-Host "--- SECURITY TESTS ---" -ForegroundColor Yellow

# Test 1: No token
$r = Invoke-Test -method "GET" -path "/api/formularios"
Test-Case "Access without token returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

# Test 2: Invalid token  
$r = Invoke-Test -method "GET" -path "/api/formularios" -token "invalid-token"
Test-Case "Invalid token returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

# Test 3: Non-existent route
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/nonexistent" -Method GET -ErrorAction Stop | Out-Null
    Test-Case "Non-existent route returns 404" $false "Got success"
} catch {
    Test-Case "Non-existent route returns 404" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

Write-Host "`n--- AUTHENTICATION TESTS ---" -ForegroundColor Yellow

# Test 4: Login empty
$r = Invoke-Test -method "POST" -path "/api/auth/login" -body @{email=""; password=""}
Test-Case "Login with empty fields" ($r.Status -eq 400 -or $r.Status -eq 401) "Status: $($r.Status)"

# Test 5: Login wrong credentials
$r = Invoke-Test -method "POST" -path "/api/auth/login" -body @{email="test@test.com"; password="wrongpass"}
Test-Case "Login with wrong credentials" ($r.Status -eq 400) "Status: $($r.Status)"

Write-Host "`n--- FORM ENDPOINTS (Protected) ---" -ForegroundColor Yellow

# Test 6: Create form without auth
$r = Invoke-Test -method "POST" -path "/api/formularios" -body @{titulo="Test"; campos=@(@{label="T"; tipo="text"})}
Test-Case "Create form without auth returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

# Test 7: Update form without auth
$r = Invoke-Test -method "PUT" -path "/api/formularios/123" -body @{titulo="Test"}
Test-Case "Update form without auth returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

# Test 8: Delete form without auth
$r = Invoke-Test -method "DELETE" -path "/api/formularios/123"
Test-Case "Delete form without auth returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

# Test 9: Get profile without auth
$r = Invoke-Test -method "GET" -path "/api/usuarios/perfil"
Test-Case "Get profile without auth returns 401" ($r.Status -eq 401) "Status: $($r.Status)"

Write-Host "`n--- CORS TESTS ---" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/formularios" -Method GET
    $cors = $response.Headers["Access-Control-Allow-Origin"]
    Test-Case "CORS headers present" ($cors -ne $null) "CORS: $cors"
} catch {
    $cors = $_.Exception.Response.Headers["Access-Control-Allow-Origin"]
    Test-Case "CORS headers present on error response" ($cors -ne $null) "CORS: $cors"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$total = $passed + $failed
Write-Host "Total: $total | Passed: $passed | Failed: $failed" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
} else {
    $rate = [math]::Round(($passed / $total) * 100, 1)
    Write-Host "`nSome tests failed. Success rate: $rate%" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan

exit $failed
