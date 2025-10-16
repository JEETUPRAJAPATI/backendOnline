const mysql = require('mysql2/promise');
require('dotenv').config();

// Based on your phpMyAdmin URL, let's try these variations
const possibleHosts = [
    'db1338.hstgr.io',
    'auth-db1338.hstgr.io', 
    'srv1338.hstgr.io',
    'mysql1338.hstgr.io',
    'localhost' // Sometimes Hostinger uses localhost for remote connections
];

async function findCorrectHost() {
    console.log('=== Finding Correct Hostinger Host ===');
    console.log('Database:', process.env.DB_NAME);
    console.log('Username:', process.env.DB_USER);
    console.log('\n🔍 Testing hosts based on your phpMyAdmin URL...\n');

    for (let i = 0; i < possibleHosts.length; i++) {
        const host = possibleHosts[i];
        console.log(`[${i + 1}/${possibleHosts.length}] Testing: ${host}`);

        try {
            const connection = await mysql.createConnection({
                host: host,
                port: 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                connectTimeout: 10000
            });

            // Test with a simple query
            const [rows] = await connection.execute('SELECT 1 + 1 AS result');
            const [tables] = await connection.execute('SHOW TABLES');
            await connection.end();

            console.log(`✅ SUCCESS! Working host found: ${host}`);
            console.log(`✅ Found ${tables.length} tables in database\n`);
            
            console.log('🎉 UPDATE YOUR .env FILE WITH:');
            console.log(`DB_HOST="${host}"`);
            
            return host;

        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                console.log(`   ❌ Host not found`);
            } else if (error.code === 'ECONNREFUSED') {
                console.log(`   ❌ Connection refused`);
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.log(`   ❌ Access denied - Remote MySQL may not be enabled`);
            } else if (error.code === 'ETIMEDOUT') {
                console.log(`   ❌ Connection timeout`);
            } else {
                console.log(`   ❌ ${error.code}: ${error.message}`);
            }
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n❌ No working host found.');
    console.log('\n🔧 You need to:');
    console.log('1. Enable "Remote MySQL" in your Hostinger control panel');
    console.log('2. Add your IP address to allowed connections');
    console.log('3. Get the exact external connection host from Hostinger');
    console.log('\n💡 The phpMyAdmin URL shows db1338.hstgr.io but this might be internal only.');
    console.log('Check your Hostinger database settings for "External Connections" or "Remote MySQL"');
    
    return null;
}

findCorrectHost().catch(console.error);