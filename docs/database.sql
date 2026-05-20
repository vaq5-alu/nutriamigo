-- Script de creación de Base de Datos Híbrida NutrIAmigo (V2 - Estabilizada)
-- Este esquema incluye lógica de peso inicial y meta para el TFG.

CREATE DATABASE IF NOT EXISTS nutriamigo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutriamigo;

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Perfiles (Actualizado con Peso Inicial y Meta)
CREATE TABLE IF NOT EXISTS profiles (
    user_id VARCHAR(128) PRIMARY KEY,
    age INT,
    gender VARCHAR(20),
    height INT,
    start_weight DECIMAL(5,2), -- Peso del primer registro
    current_weight DECIMAL(5,2), -- Peso actual
    target_weight DECIMAL(5,2), -- Meta (imprescindible para TFG)
    start_date DATE, -- Fecha del primer registro
    goal VARCHAR(100),
    activity_level VARCHAR(50),
    calories INT DEFAULT 2000,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Checkins diarios
CREATE TABLE IF NOT EXISTS daily_checkins (
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
);

-- 4. Comidas
CREATE TABLE IF NOT EXISTS meal_logs (
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
);

-- 5. Lista de compra
CREATE TABLE IF NOT EXISTS shopping_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity VARCHAR(50),
    is_bought BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Historial de pesos
CREATE TABLE IF NOT EXISTS weight_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
