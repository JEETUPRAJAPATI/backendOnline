# LocalXList API Quick Tester
# PowerShell script to quickly test API endpoints

param(
    [string]$Environment = "production",
    [string]$Endpoint = "/api/v1/home/countries"
)

# Set base URL based on environment
$BaseUrl = if ($Environment -eq "local") { "http://localhost:3002" } else { "https://apilocalxlist.shrawantravels.com" }

# Generate API key
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$keyWithTimestamp = "localxlist123:$timestamp"
$encodedKey = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($keyWithTimestamp))

# Prepare headers
$headers = @{
    'x-api-key' = $encodedKey
    'Content-Type' = 'application/json'
}

# Make the API call
$url = "$BaseUrl$Endpoint"

Write-Host "🚀 LocalXList API Tester" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host "API Key: $encodedKey" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Making API call..." -ForegroundColor Green
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "💡 Usage Examples:" -ForegroundColor Cyan
Write-Host ".\test-api.ps1 -Environment production -Endpoint '/api/v1/home/countries'"
Write-Host ".\test-api.ps1 -Environment local -Endpoint '/api/v1/home/seo'"
Write-Host ".\test-api.ps1 -Environment production -Endpoint '/api/v1/home/partners'"