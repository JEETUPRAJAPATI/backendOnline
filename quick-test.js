const mysql = require('mysql2/promise');
require('dotenv').config();

async function quickTest() {
    console.log('=== Quick Database Test ===');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connection successful!');

        // Test simple query
        const [result] = await connection.execute('SELECT 1 + 1 AS test');
        console.log('✅ Query test:', result[0]);

        // Check tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Database has ${tables.length} tables`);

        await connection.end();
        
        console.log('\n🎉 SUCCESS! Your database is working perfectly!');
        console.log('🚀 You can now run: npm run dev');
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

quickTest();