const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicialización global de la IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- ENDPOINT DE SALUD PARA TESTS ---
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- PRUEBA DE CONEXIÓN ---
db.getConnection()
    .then(async connection => {
        console.log("✅ Conexión a MySQL en AIVEN exitosa");
        try {
            await connection.query('ALTER TABLE profiles ADD COLUMN is_premium TINYINT DEFAULT 0').catch(() => {});
            await connection.query('ALTER TABLE profiles ADD COLUMN premium_until DATETIME DEFAULT NULL').catch(() => {});
            await connection.query('ALTER TABLE profiles ADD COLUMN auto_renew TINYINT DEFAULT 1').catch(() => {});
            console.log("✨ Tablas verificadas.");
        } catch (err) {
            console.log("⚠️ Nota: Error menor en verificación de tablas.");
        }
        connection.release();
    })
    .catch(err => {
        console.error("❌ ERROR CRÍTICO DE CONEXIÓN A MYSQL:");
        console.error("Mensaje:", err.message);
        console.error("Código:", err.code);
        console.error("Host intentado:", process.env.DB_HOST);
    });

const cleanParam = (val) => (val === undefined || val === null || val === '') ? null : val;

// Configuración de autenticación
const authenticateUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId || userId === 'undefined') return res.status(401).json({ error: 'Usuario no identificado' });
    req.userId = userId;
    next();
};

app.post('/api/auth/sync', async (req, res) => {
    try {
        const { uid, email, username } = req.body;
        if (!uid) return res.status(400).json({ error: 'UID missing' });

        // 1. Limpiar registros "fantasmas": si el email existe con otro UID, lo borramos
        // Esto pasa si el usuario borró su cuenta en Firebase pero MySQL no se enteró
        await db.execute('DELETE FROM users WHERE email = ? AND id != ?', [email, uid]);

        // 2. Sincronizar (Insert o Update si el UID coincide)
        await db.execute(
            `INSERT INTO users (id, username, email) VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email)`,
            [uid, cleanParam(username) || email.split('@')[0], cleanParam(email)]
        );

        // 3. Asegurar perfil
        const [profiles] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [uid]);
        if (profiles.length === 0) {
            await db.execute('INSERT INTO profiles (user_id, xp, level) VALUES (?, 0, 1)', [uid]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/auth/account', authenticateUser, async (req, res) => {
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [req.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/profile', authenticateUser, async (req, res) => {
    try {
        const [profiles] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
        if (profiles.length === 0) return res.json(null);
        const [userData] = await db.execute('SELECT username, email FROM users WHERE id = ?', [req.userId]);
        res.json({ ...profiles[0], ...userData[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/profile', authenticateUser, async (req, res) => {
    try {
        const d = req.body;
        const uid = req.userId;

        // Cargar perfil actual para ver si ya tiene peso inicial
        const [current] = await db.execute('SELECT start_weight, start_date FROM profiles WHERE user_id = ?', [uid]);
        let startWeight = current[0]?.start_weight;
        let startDate = current[0]?.start_date;

        // Si se recibe un peso y no hay peso inicial, grabarlo como inicio
        if (!startWeight && d.current_weight) {
            startWeight = d.current_weight;
            startDate = new Date().toISOString().split('T')[0];
        }

        const params = [
            cleanParam(d.age),
            cleanParam(d.gender),
            cleanParam(d.height),
            cleanParam(d.current_weight),
            cleanParam(startWeight),
            cleanParam(d.target_weight),
            cleanParam(startDate),
            cleanParam(d.goal),
            cleanParam(d.activity_level),
            cleanParam(d.calories),
            uid
        ];

        await db.execute(
            `UPDATE profiles SET 
            age = ?, gender = ?, height = ?, current_weight = ?, start_weight = ?, target_weight = ?, start_date = ?, goal = ?, activity_level = ?, calories = ?
            WHERE user_id = ?`,
            params
        );

        if (d.username) {
            await db.execute('UPDATE users SET username = ? WHERE id = ?', [d.username, uid]);
        }

        const [updated] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [uid]);
        const [userBase] = await db.execute('SELECT username, email FROM users WHERE id = ?', [uid]);
        res.json({ ...updated[0], ...userBase[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DIARIO Y CHECKINS
app.get('/api/daily-checkin', authenticateUser, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [checkins] = await db.execute('SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?', [req.userId, today]);
        res.json(checkins[0] || null);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily-checkin', authenticateUser, async (req, res) => {
    try {
        const { date, sleep, energy, stress, water, steps, mood } = req.body;
        const today = date || new Date().toISOString().split('T')[0];
        await db.execute(
            `INSERT INTO daily_checkins (user_id, date, sleep, energy, stress, water, steps, mood) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE sleep=VALUES(sleep), energy=VALUES(energy), stress=VALUES(stress), water=VALUES(water), steps=VALUES(steps), mood=VALUES(mood)`,
            [req.userId, today, cleanParam(sleep), cleanParam(energy), cleanParam(stress), water || 0, steps || 0, cleanParam(mood)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/daily-log/:date', authenticateUser, async (req, res) => {
    const [meals] = await db.execute('SELECT * FROM meal_logs WHERE user_id = ? AND date = ?', [req.userId, req.params.date]);
    res.json(meals);
});

app.post('/api/daily-log', authenticateUser, async (req, res) => {
    const { date, name, calories, mealType, protein, carbs, fat } = req.body;
    await db.execute(
        'INSERT INTO meal_logs (user_id, date, name, calories, meal_type, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.userId, date, name, calories || 0, mealType || 'snack', protein || 0, carbs || 0, fat || 0]
    );
    res.json({ success: true });
});

// VACIAR DIARIO COMPLETO (Debe ir antes de :id para evitar conflicto)
app.delete('/api/daily-log/all', authenticateUser, async (req, res) => {
    try {
        const { date } = req.query;
        console.log(`[BACKEND] Solicitud: Vaciar diario para ${req.userId} en fecha ${date}`);
        if (!date) return res.status(400).json({ error: 'Falta la fecha' });
        
        const [result] = await db.query('DELETE FROM meal_logs WHERE user_id = ? AND date = ?', [req.userId, date]);
        console.log(`[BACKEND] OK: ${result.affectedRows} filas borradas.`);
        res.json({ success: true, affectedRows: result.affectedRows });
    } catch (error) {
        console.error('[BACKEND ERROR] Fallo al vaciar diario:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/daily-log/name/:name', authenticateUser, async (req, res) => {
    try {
        const { date } = req.query;
        await db.execute('DELETE FROM meal_logs WHERE user_id = ? AND name LIKE ? AND date = ?', [req.userId, `%${req.params.name}%`, date]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/daily-log/:id', authenticateUser, async (req, res) => {
    try {
        await db.execute('DELETE FROM meal_logs WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/shopping-list', authenticateUser, async (req, res) => {
    const [items] = await db.execute('SELECT * FROM shopping_items WHERE user_id = ?', [req.userId]);
    res.json(items);
});

app.post('/api/shopping-list', authenticateUser, async (req, res) => {
    await db.execute('INSERT INTO shopping_items (user_id, name) VALUES (?, ?)', [req.userId, cleanParam(req.body.name)]);
    res.json({ success: true });
});

app.delete('/api/shopping-list', authenticateUser, async (req, res) => {
    await db.execute('DELETE FROM shopping_items WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
});

app.delete('/api/shopping-list/item', authenticateUser, async (req, res) => {
    const { name } = req.body;
    await db.execute('DELETE FROM shopping_items WHERE user_id = ? AND name = ?', [req.userId, name]);
    res.json({ success: true });
});

app.get('/api/weight-history', authenticateUser, async (req, res) => {
    const [h] = await db.execute('SELECT * FROM weight_history WHERE user_id = ? ORDER BY date ASC', [req.userId]);
    res.json(h);
});

app.post('/api/weight-history', authenticateUser, async (req, res) => {
    const { date, weight } = req.body;
    try {
        // Usamos ON DUPLICATE KEY UPDATE para que si ya existe registro ese día, se actualice el peso
        await db.query(
            `INSERT INTO weight_history (user_id, date, weight) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE weight = VALUES(weight)`,
            [req.userId, date, weight]
        );
        res.json({ message: 'Peso guardado y actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/streak', authenticateUser, async (req, res) => {
    try {
        const uid = req.userId;
        // Obtenemos todas las fechas únicas donde hubo actividad formateadas como YYYY-MM-DD
        const [rows] = await db.execute(`
            SELECT DISTINCT act_date FROM (
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM weight_history WHERE user_id = ?
                UNION
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM daily_checkins WHERE user_id = ?
                UNION
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM meal_logs WHERE user_id = ?
            ) as activity
            ORDER BY act_date DESC
        `, [uid, uid, uid]);

        if (rows.length === 0) return res.json({ streak: 0 });

        const dates = rows.map(r => r.act_date);

        // Helper para obtener fecha local en formato YYYY-MM-DD
        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const todayStr = getLocalDateStr(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);

        console.log(`[STREAK] Dates found: ${JSON.stringify(dates)}`);
        console.log(`[STREAK] Today: ${todayStr}, Yesterday: ${yesterdayStr}`);

        // Si no hay actividad hoy ni ayer, la racha es 0
        if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
            console.log(`[STREAK] No activity today or yesterday. Resetting to 0.`);
            return res.json({ streak: 0 });
        }

        let streak = 0;
        // Importante: Inicializar con la fecha de la última actividad real (forzando mediodía)
        let currentDate = new Date(dates[0] + 'T12:00:00');

        for (let i = 0; i < dates.length; i++) {
            const expectedDateStr = getLocalDateStr(currentDate);
            console.log(`[STREAK] Iteration ${i}: Comparing ${dates[i]} with expected ${expectedDateStr}`);
            if (dates[i] === expectedDateStr) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                console.log(`[STREAK] Gap found at ${dates[i]}. Expected ${expectedDateStr}`);
                break;
            }
        }

        console.log(`[STREAK] Final calculation: ${streak}`);
        res.json({ streak });
    } catch (error) {
        console.error("Error al calcular racha:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── PREMIUM SYSTEM ──────────────────────────────────────────────────────────

app.post('/api/premium/subscribe', authenticateUser, async (req, res) => {
    try {
        console.log(`[PREMIUM] Intentando suscribir al usuario: ${req.userId}`);
        // Simulación de pago: Establecemos 30 días de premium y renovación activa
        const [result] = await db.execute(
            'UPDATE profiles SET is_premium = 1, auto_renew = 1, premium_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE user_id = ?',
            [req.userId]
        );
        
        if (result.affectedRows === 0) {
            console.error(`[PREMIUM ERROR] No se encontró perfil para el usuario ${req.userId}`);
            return res.status(404).json({ error: 'No se encontró el perfil del usuario.' });
        }

        console.log(`[PREMIUM OK] Suscripción activada para usuario ${req.userId}`);
        res.json({ success: true, message: '¡Suscripción Premium activada!' });
    } catch (error) {
        console.error('[PREMIUM ERROR] Fallo crítico:', error);
        res.status(500).json({ error: 'Error en el servidor al activar Premium', details: error.message });
    }
});

// Endpoint para dar de baja la renovación
app.post('/api/premium/cancel', authenticateUser, async (req, res) => {
    try {
        console.log(`[PREMIUM] Cancelando renovación para: ${req.userId}`);
        await db.execute('UPDATE profiles SET auto_renew = 0 WHERE user_id = ?', [req.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('[PREMIUM] Error cancel:', error);
        res.status(500).json({ error: error.message });
    }
});

// [NEW] Endpoint para reactivar la renovación
app.post('/api/premium/reactivate', authenticateUser, async (req, res) => {
    try {
        console.log(`[PREMIUM] Reactivando renovación para: ${req.userId}`);
        await db.execute('UPDATE profiles SET auto_renew = 1 WHERE user_id = ?', [req.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('[PREMIUM] Error reactivate:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para resetear TOTALMENTE (para pruebas/limpieza)
app.post('/api/premium/reset', authenticateUser, async (req, res) => {
    try {
        await db.execute('UPDATE profiles SET is_premium = 0, premium_until = NULL, auto_renew = 0 WHERE user_id = ?', [req.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/chat', authenticateUser, async (req, res) => {
    try {
        // 1. Verificar suscripción Premium
        const [profiles] = await db.execute('SELECT is_premium, premium_until FROM profiles WHERE user_id = ?', [req.userId]);
        const authProfile = profiles[0];
        
        const now = new Date();
        const expires = authProfile?.premium_until ? new Date(authProfile.premium_until) : null;
        
        if (!authProfile?.is_premium || !expires || expires < now) {
            return res.status(403).json({ 
                error: 'Premium Required', 
                message: 'El acceso al NutriCoach IA es exclusivo para usuarios Premium. ¡Suscríbete para continuar!' 
            });
        }

        const { userMessage, context } = req.body;
        const { profile, dailyLog = [], shoppingList = [], viewDate } = context;
        const todayStr = viewDate ? new Date(viewDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }) : 'Hoy';

        const systemPrompt = `Eres NutriCoach, un asistente experto en nutrición y salud. 
        Usuario: ${profile?.username}, Objetivo: ${profile?.goal}, Peso: ${profile?.current_weight}kg, Meta: ${profile?.target_weight}kg.
        Fecha actual: ${todayStr}.
        Contexto del diario: ${dailyLog.map(l => `${l.name} (${l.mealType || l.meal_type})`).join(', ') || 'Sin registros aún'}.
        Lista de la compra: ${shoppingList.map(i => i.name).join(', ') || 'Vacía'}.
        Responde de forma amable, experta y motivadora. Cuando el usuario quiera registrar una comida, estima sus calorías y macronutrientes (proteínas, carbohidratos, grasas) basándote en tu conocimiento, y pregunta si hubo algún ingrediente extra o bebida. Mantén tus respuestas en español.
        
        MUY IMPORTANTE: Tienes la capacidad de interactuar con la aplicación del usuario.
        Si necesitas realizar alguna de las siguientes acciones (PORQUE EL USUARIO TE LO PIDE EXPLICITAMENTE), debes añadir al FINAL de tu respuesta exactamente el texto "---ACTIONS---" seguido de un array JSON válido con las acciones a realizar.
        Si el usuario solo te saluda o hace una pregunta informativa, NO añadas el texto "---ACTIONS---" ni ningún JSON.
        No uses markdown para el JSON.
        
        Las acciones disponibles son:
        1. Añadir a la lista de la compra: {"action": "add_shopping", "items": ["manzanas", "peras"]}
        2. Añadir comida al diario: {"action": "add_log", "item": "Pollo con arroz", "calories": 450, "protein": 30, "carbs": 50, "fat": 15, "mealType": "comida", "isTomorrow": false}
        3. Vaciar lista de compra: {"action": "clear_shopping"}
        4. Eliminar del diario: {"action": "remove_log", "item": "NOMBRE_EXACTO_DEL_PLATO"}
        5. Eliminar de la lista de compra: {"action": "remove_shopping", "item": "NOMBRE_DEL_PRODUCTO"}
        6. Vaciar diario de hoy: {"action": "clear_log"}
        
        IMPORTANTE PARA ELIMINAR/CAMBIAR:
        - Si el usuario dice "borra la comida" o "cambia la comida", busca en el "Contexto del diario" qué platos hay en esa categoría (mealType) y usa sus NOMBRES EXACTOS para "remove_log". 
        - NUNCA uses nombres de categorías como "comida" o "desayuno" en el campo "item" de "remove_log".
        - Si el usuario quiere vaciar TODO el día, usa "clear_log".
        - Si pide "CAMBIAR" A por B, envía primero el "remove_log" de A (usando su nombre real del contexto) y luego el "add_log" de B.
        
        Nota: En "add_log", "mealType" DEBE ser uno de estos: "desayuno", "comida", "cena", "snack". 
        ESTIMA SIEMPRE las calorías y macronutrientes (proteína, carbos, grasa) basándote en el plato. NUNCA envíes 0 si es una comida real.
        
        Ejemplo: Si en el contexto hay "macarrones boloñesa" en "comida" y el usuario dice "quita la comida", debes enviar {"action": "remove_log", "item": "macarrones boloñesa"}.
        
        Ejemplo de respuesta:
        ¡Claro! He añadido manzanas a tu lista de la compra.
        ---ACTIONS---
        [{"action": "add_shopping", "items": ["manzanas"]}]
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-lite-latest",
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        });

        console.log("🤖 Inicializando chat con NutriCoach para:", profile?.username || req.userId);

        // Gemini API EXIGE que el historial termine con 'model' y empiece con 'user' alternándose.
        // Vamos a recorrer el historial hacia atrás para extraer mensajes válidos alternados.
        let validHistory = [];
        let expectedRole = 'model'; // Porque el chat.sendMessage() mandará 'user', el historial DEBE acabar en 'model'.
        const rawHistory = context.chatHistory || [];

        for (let i = rawHistory.length - 1; i >= 0; i--) {
            const role = rawHistory[i].sender === 'user' ? 'user' : 'model';
            // Solo nos quedamos con mensajes que respeten la alternancia estricta
            if (role === expectedRole) {
                validHistory.unshift({ role, parts: [{ text: rawHistory[i].text }] });
                expectedRole = expectedRole === 'model' ? 'user' : 'model';
            }
        }

        // Gemini EXIGE que el historial empiece por 'user'. Si el primer mensaje filtrado es 'model', lo quitamos.
        while (validHistory.length > 0 && validHistory[0].role !== 'user') {
            validHistory.shift();
        }

        const chat = model.startChat({
            history: validHistory
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();
        res.json({ responseText });
    } catch (error) {
        console.error("Gemini Error Detallado:", error);
        res.status(500).json({ error: "NutriCoach no puede responder ahora mismo por un error de conexión con Google." });
    }
});

app.post('/api/ai/menu', authenticateUser, async (req, res) => {
    try {
        const { profileData, checkinData, customInstruction } = req.body;

        const systemPrompt = `Eres un chef experto en nutrición. Crea un menú saludable de 4 comidas (desayuno, comida, snack, cena) basado en este perfil: 
        Objetivo: ${profileData?.goal || 'Mantener peso'}, Calorías diarias: ${profileData?.calories || 2000}.
        Intolerancias/Preferencias: ${profileData?.intolerances?.join(', ') || 'Ninguna'}.
        Datos de hoy: Energía ${checkinData?.energy || 3}/5, Estrés ${checkinData?.stress || 3}/5.
        Instrucción personalizada: ${customInstruction || 'Ninguna'}.
        
        Devuelve el resultado ESTRICTAMENTE como un JSON array de objetos (sin markdown, solo el JSON puro). Cada objeto DEBE tener:
        - name: Nombre de la receta
        - calories: Número entero de calorías
        - reason: Por qué es buena para hoy
        - ingredients: Array de strings con los ingredientes
        - mealType: "desayuno", "comida", "snack" o "cena"
        - tags: Array de strings (ej. "alto en proteína")`;

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-lite-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const result = await model.generateContent(systemPrompt);
        let responseText = result.response.text();

        if (responseText.startsWith('\`\`\`json')) {
            responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        } else if (responseText.startsWith('\`\`\`')) {
            responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
        }

        const menu = JSON.parse(responseText);
        res.json({ menu });
    } catch (error) {
        console.error("Gemini Menu Error:", error);
        res.status(500).json({ error: "Error al generar el menú." });
    }
});

app.post('/api/ai/analyze', authenticateUser, async (req, res) => {
    try {
        res.status(501).json({ error: "Not implemented" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const server = app.listen(PORT, () => console.log(`🚀 Backend Híbrido V2 en http://localhost:${PORT}`));

module.exports = { app, db, server };
