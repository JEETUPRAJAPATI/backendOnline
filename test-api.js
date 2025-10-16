// API Test Script for LocalXList Backend
// This script shows how to properly authenticate with your API

const http = require('http');
const https = require('https');
const url = require('url');

const API_BASE_URL = 'http://localhost:3002';
const API_KEY = 'localxlist123'; // From your .env file

// Function to generate the required API key format
function generateAPIKey() {
    const timestamp = Math.floor(Date.now() / 1000);
    const keyWithTimestamp = `${API_KEY}:${timestamp}`;
    const encodedKey = Buffer.from(keyWithTimestamp).toString('base64');
    return encodedKey;
}

// Function to make authenticated API calls using Node.js http module
function makeAPICall(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const apiKey = generateAPIKey();
        const urlParts = url.parse(`${API_BASE_URL}${endpoint}`);
        
        const options = {
            hostname: urlParts.hostname,
            port: urlParts.port,
            path: urlParts.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }
        
        const req = http.request(options, (res) => {
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

// Test different endpoints
async function testAPI() {
    console.log('🚀 Testing LocalXList API...');
    console.log('Base URL:', API_BASE_URL);
    console.log('Generated API Key:', generateAPIKey());
    
    // Test public endpoints (no auth required)
    console.log('\n📍 Testing PUBLIC endpoints:');
    await makeAPICall('/api/v1/home/seo');
    await makeAPICall('/api/v1/home/topNotice');
    await makeAPICall('/api/v1/home/dashboardContent');
    
    // Test authenticated endpoints
    console.log('\n🔐 Testing AUTHENTICATED endpoints:');
    await makeAPICall('/api/v1/home/countries');
    await makeAPICall('/api/v1/home/countriesV2');
    await makeAPICall('/api/v1/home/partners');
    
    console.log('\n✅ API tests completed!');
    console.log('\n📝 How to use the API:');
    console.log('1. Generate API key: Base64 encode "localxlist123:timestamp"');
    console.log('2. Send as header: x-api-key: <encoded-key>');
    console.log('3. API key expires in 2 minutes');
    console.log('\n🔗 For more details, see API-TESTING-GUIDE.md');
}

// If running directly (not imported)
if (require.main === module) {
    testAPI();
}

module.exports = { generateAPIKey, makeAPICall };