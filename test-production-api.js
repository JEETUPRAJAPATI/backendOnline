// Production API Test Script for LocalXList Backend
// This script tests your live production API

const https = require('https');
const http = require('http');
const url = require('url');

const PRODUCTION_API_BASE_URL = 'https://apilocalxlist.shrawantravels.com';
const API_KEY = 'localxlist123'; // Your API key

// Function to generate the required API key format
function generateAPIKey() {
    const timestamp = Math.floor(Date.now() / 1000);
    const keyWithTimestamp = `${API_KEY}:${timestamp}`;
    const encodedKey = Buffer.from(keyWithTimestamp).toString('base64');
    return encodedKey;
}

// Function to make authenticated API calls to production
function makeProductionAPICall(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const apiKey = generateAPIKey();
        const fullUrl = `${PRODUCTION_API_BASE_URL}${endpoint}`;
        const urlParts = url.parse(fullUrl);
        
        const options = {
            hostname: urlParts.hostname,
            port: urlParts.port || (urlParts.protocol === 'https:' ? 443 : 80),
            path: urlParts.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'User-Agent': 'LocalXList-API-Test/1.0'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }
        
        const requestModule = urlParts.protocol === 'https:' ? https : http;
        
        const req = requestModule.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log(`\n=== ${method} ${endpoint} ===`);
                    console.log('Status:', res.statusCode);
                    console.log('API Key Used:', apiKey);
                    console.log('Response:', JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (error) {
                    console.log(`\n❌ Error parsing response for ${endpoint}:`, responseData);
                    resolve(null);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`\n❌ Error calling ${endpoint}:`, error.message);
            resolve(null);
        });
        
        if (data && (method === 'POST' || method === 'PUT')) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Test production API
async function testProductionAPI() {
    console.log('🚀 Testing Production LocalXList API...');
    console.log('Base URL:', PRODUCTION_API_BASE_URL);
    console.log('Generated API Key Example:', generateAPIKey());
    
    // Test public endpoints first
    console.log('\n📍 Testing PUBLIC endpoints (no auth required):');
    await makeProductionAPICall('/api/v1/home/seo');
    await makeProductionAPICall('/api/v1/home/topNotice');
    await makeProductionAPICall('/api/v1/home/dashboardContent');
    
    // Test authenticated endpoints
    console.log('\n🔐 Testing AUTHENTICATED endpoints:');
    await makeProductionAPICall('/api/v1/home/countries');
    await makeProductionAPICall('/api/v1/home/countriesV2');
    await makeProductionAPICall('/api/v1/home/partners');
    
    console.log('\n✅ Production API tests completed!');
    console.log('\n📝 Production API Usage:');
    console.log('1. Base URL: https://apilocalxlist.shrawantravels.com');
    console.log('2. Generate API key: Base64 encode "localxlist123:current_timestamp"');
    console.log('3. Send as header: x-api-key: <encoded-key>');
    console.log('4. API key expires in 2 minutes');
    
    console.log('\n🔗 Example curl command:');
    const exampleKey = generateAPIKey();
    console.log(`curl -X GET "${PRODUCTION_API_BASE_URL}/api/v1/home/countries" \\`);
    console.log(`  -H "x-api-key: ${exampleKey}"`);
}

// If running directly (not imported)
if (require.main === module) {
    testProductionAPI();
}

module.exports = { generateAPIKey, makeProductionAPICall };