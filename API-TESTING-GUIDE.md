# LocalXList API Testing Guide

## 🚀 Your API is Successfully Running!

**Base URL:** `http://localhost:3002`
**API Key:** `localxlist123` (from your .env file)

## 🔐 Authentication

Your API uses a time-based API key system:

### Format Required:
```
Header: x-api-key: <base64-encoded-key>
Key Format: localxlist123:timestamp (base64 encoded)
Expiration: 2 minutes
```

### Generate API Key (JavaScript):
```javascript
const timestamp = Math.floor(Date.now() / 1000);
const keyWithTimestamp = `localxlist123:${timestamp}`;
const encodedKey = Buffer.from(keyWithTimestamp).toString('base64');
```

### Generate API Key (PowerShell):
```powershell
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$keyWithTimestamp = "localxlist123:$timestamp"
$encodedKey = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($keyWithTimestamp))
$headers = @{'x-api-key' = $encodedKey}
```

## 📍 Available Endpoints

### Public Endpoints (No Auth Required):
- `GET /api/v1/home/seo` - ✅ Working
- `GET /api/v1/home/topNotice`
- `GET /api/v1/home/dashboardContent`

### Authenticated Endpoints (API Key Required):
- `GET /api/v1/home/countries`
- `GET /api/v1/home/countriesV2`
- `GET /api/v1/home/loadMoreCountries`
- `GET /api/v1/home/loadMoreCities`
- `GET /api/v1/home/loadMoreSubcities`
- `GET /api/v1/home/partners`
- `GET /api/v1/home/sponsers`

## 🧪 Testing Examples

### Using PowerShell:
```powershell
# Test public endpoint
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/home/seo"

# Test authenticated endpoint
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$keyWithTimestamp = "localxlist123:$timestamp"
$encodedKey = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($keyWithTimestamp))
$headers = @{'x-api-key' = $encodedKey}
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/home/countries" -Headers $headers
```

### Using curl (if available):
```bash
# Generate base64 key (manual)
# echo -n "localxlist123:$(date +%s)" | base64

curl -X GET "http://localhost:3002/api/v1/home/countries" \
  -H "x-api-key: YOUR_BASE64_ENCODED_KEY"
```

### Using Postman:
1. Set URL: `http://localhost:3002/api/v1/home/countries`
2. Add Header: `x-api-key` with base64 encoded value
3. Generate key: `localxlist123:current_timestamp` (base64 encoded)

## 🔍 Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Data retrieved successfully.",
  "data": { ... }
}
```

### Error Responses:
```json
// Missing API Key
{
  "success": false,
  "message": "Required API Key.",
  "code": "REQUIRED_API_KEY"
}

// Invalid API Key
{
  "success": false,
  "message": "Invalid API Key.",
  "code": "INVALID_API_KEY"
}

// Expired API Key
{
  "success": false,
  "message": "API Key expired.",
  "code": "EXPIRED_API_KEY"
}
```

## 🎯 Your API Status:
✅ Server running on port 3002
✅ Database connected to Hostinger MySQL
✅ Authentication system working
✅ API endpoints responding correctly

## 🛠️ Next Steps:
1. Test more endpoints using the authentication method above
2. Integrate with your frontend application
3. Set up proper environment variables for production
4. Consider implementing rate limiting for production use