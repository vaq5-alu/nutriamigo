const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });

    console.log("🛠️ Re-inicializando Base de Datos Híbrida (V2 - Peso y Meta)...");

    try {
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME || 'nutriamigo'}`);
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME || 'nutriamigo'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE ${process.env.DB_NAME || 'nutriamigo'}`);

        const tables = [
            `CREATE TABLE users (
                id VARCHAR(128) PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE profiles (
                user_id VARCHAR(128) PRIMARY KEY,
                age INT,
                gender VARCHAR(20),
                height INT,
                start_weight DECIMAL(5,2),
                current_weight DECIMAL(5,2),
                target_weight DECIMAL(5,2),
                start_date DATE,
                goal VARCHAR(100),
                activity_level VARCHAR(50),
                calories INT DEFAULT 2000,
                xp INT DEFAULT 0,
                level INT DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE daily_checkins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                date DATE NOT NULL,
                sleep INT,
                energy INT,
                stress INT,
                water INT DEFAULT 0,
                steps INT DEFAULT 0,
                mood VARCHAR(50),
                UNIQUE KEY user_date_checkin (user_id, date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE meal_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                date DATE NOT NULL,
                name VARCHAR(255) NOT NULL,
                calories INT DEFAULT 0,
                meal_type ENUM('desayuno', 'comida', 'cena', 'snack') DEFAULT 'snack',
                protein DECIMAL(5,1) DEFAULT 0,
                carbs DECIMAL(5,1) DEFAULT 0,
                fat DECIMAL(5,1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE shopping_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                name VARCHAR(255) NOT NULL,
                quantity VARCHAR(50),
                is_bought BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE weight_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                date DATE NOT NULL,
                weight DECIMAL(5,2) NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
        ];

        for (const sql of tables) {
            await connection.query(sql);
        }

        console.log("✅ Base de Datos V2 lista.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await connection.end();
    }
}

initDB();
