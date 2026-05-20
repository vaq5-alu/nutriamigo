require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

const tables = [
    `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS profiles (
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
    `CREATE TABLE IF NOT EXISTS daily_checkins (
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
    `CREATE TABLE IF NOT EXISTS meal_logs (
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
    `CREATE TABLE IF NOT EXISTS shopping_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(50),
        is_bought BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS weight_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        date DATE NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
];

async function migrate() {
    let connection;
    try {
        console.log('Conectando a Aiven MySQL...');
        connection = await mysql.createConnection(config);
        console.log('Conexión establecida.');

        for (const sql of tables) {
            console.log('Ejecutando creación de tabla...');
            await connection.execute(sql);
        }

        console.log('MIGRACIÓN COMPLETADA CON ÉXITO.');
    } catch (err) {
        console.error('ERROR EN MIGRACIÓN:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
