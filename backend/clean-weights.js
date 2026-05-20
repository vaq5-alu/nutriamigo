const mysql = require('mysql2/promise');
require('dotenv').config();

async function clean() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nutriamigo'
    });

    try {
        console.log("Cleaning duplicates...");
        await db.execute(`
            DELETE w1 FROM weight_history w1
            INNER JOIN weight_history w2 
            WHERE w1.id < w2.id AND w1.user_id = w2.user_id AND w1.date = w2.date;
        `);
        
        console.log("Adding UNIQUE KEY...");
        await db.execute(`ALTER TABLE weight_history ADD UNIQUE KEY unique_user_date (user_id, date);`);
        console.log("Done.");
    } catch(e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
clean();
