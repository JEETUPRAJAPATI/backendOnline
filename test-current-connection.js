const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCurrentConnection() {
    console.log('=== Testing Current Database Connection ===');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET');
    console.log('----------------------------------------');

    try {
        // Clean the host (remove spaces and port if included in host)
        let cleanHost = process.env.DB_HOST.trim();
        let port = process.env.DB_PORT || 3306;
        
        // If host contains port, extract it
        if (cleanHost.includes(':')) {
            const [hostPart, portPart] = cleanHost.split(':');
            cleanHost = hostPart;
            port = portPart || port;
        }

        console.log('Cleaned Host:', cleanHost);
        console.log('Port:', port);
        console.log('\n🔄 Attempting connection...');

        const connection = await mysql.createConnection({
            host: cleanHost,
            port: parseInt(port),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 15000
        });

        console.log('✅ Connection established successfully!');

        // Test a simple query
        const [rows] = await connection.execute('SELECT 1 + 1 AS result, NOW() AS current_time');
        console.log('✅ Query test successful:', rows[0]);

        // Test database access
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Database access successful! Found ${tables.length} tables.`);
        
        if (tables.length > 0) {
            console.log('📋 Tables in database:');
            tables.forEach((table, index) => {
                console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
            });
        }

        await connection.end();
        
        console.log('\n🎉 SUCCESS! Your database connection is working perfectly!');
        console.log('✅ You can now run: npm run dev');
        
        return true;

    } catch (error) {
        console.log('\n❌ Connection failed:');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        
        if (error.code === 'ENOTFOUND') {
            console.log('\n💡 Solution: The host address could not be found');
            console.log('   - Check if the host address is correct');
            console.log('   - For Hostinger, get the exact host from your control panel');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Connection was refused');
            console.log('   - Check if the database server is running');
            console.log('   - Verify the port number is correct');
            console.log('   - For Hostinger, ensure Remote MySQL is enabled');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Solution: Access denied');
            console.log('   - Check your username and password');
            console.log('   - For Hostinger, verify your IP is in allowed list');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('\n💡 Solution: Connection timeout');
            console.log('   - Check your internet connection');
            console.log('   - For Hostinger, ensure Remote MySQL is enabled');
            console.log('   - Add your IP to Hostinger\'s allowed connections');
        }
        
        return false;
    }
}

testCurrentConnection();