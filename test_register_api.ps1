# 测试用户注册API
$uri = "http://localhost:3000/api/auth/register"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    username = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')"
    email = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "test123456"
} | ConvertTo-Json

Write-Host "测试用户注册API..."
Write-Host "URL: $uri"
Write-Host "Body: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body
    Write-Host "状态码: $($response.StatusCode)"
    Write-Host "响应内容: $($response.Content)"
} catch {
    Write-Host "错误: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "状态码: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应: $responseBody"
    }
}