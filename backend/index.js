const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'nutriamigo-fd9f9';

// Inicialización global de la IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- ENDPOINT DE SALUD PARA TESTS ---
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- PRUEBA DE CONEXIÓN ---
db.getConnection()
    .then(async connection => {
        console.log("✅ Conexión a MySQL exitosa");
        try {
            await connection.query('ALTER TABLE profiles ADD COLUMN is_premium TINYINT DEFAULT 0').catch(() => {});
            await connection.query('ALTER TABLE profiles ADD COLUMN premium_until DATETIME DEFAULT NULL').catch(() => {});
            await connection.query('ALTER TABLE profiles ADD COLUMN auto_renew TINYINT DEFAULT 1').catch(() => {});
            await connection.query('ALTER TABLE profiles ADD COLUMN name VARCHAR(100) DEFAULT NULL').catch(() => {});
            // weight_history necesita UNIQUE(user_id, date) para que el upsert de peso
            // funcione; sin él se acumulaban registros duplicados por día.
            await connection.query(`DELETE w1 FROM weight_history w1
                JOIN weight_history w2 ON w1.user_id = w2.user_id AND w1.date = w2.date AND w1.id < w2.id`).catch(() => {});
            await connection.query('ALTER TABLE weight_history ADD UNIQUE KEY user_date_weight (user_id, date)').catch(() => {});
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

// Fecha local YYYY-MM-DD sin desfase UTC
const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

// ─── VERIFICACIÓN DE TOKENS DE FIREBASE ──────────────────────────────────────
// Verifica la firma del ID Token contra los certificados públicos de Google,
// sin necesitar firebase-admin. Los certificados se cachean según su max-age.
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certsCache = { certs: null, expiresAt: 0 };

const getGoogleCerts = async () => {
    if (certsCache.certs && Date.now() < certsCache.expiresAt) return certsCache.certs;
    const response = await fetch(GOOGLE_CERTS_URL);
    if (!response.ok) throw new Error(`Certs HTTP ${response.status}`);
    const certs = await response.json();
    const cacheControl = response.headers.get('cache-control') || '';
    const maxAge = parseInt((cacheControl.match(/max-age=(\d+)/) || [])[1], 10) || 3600;
    certsCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
    return certs;
};

const verifyFirebaseToken = async (idToken) => {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header.kid) throw new Error('Token malformado');
    const certs = await getGoogleCerts();
    const cert = certs[decoded.header.kid];
    if (!cert) throw new Error('Certificado desconocido (kid)');
    return jwt.verify(idToken, cert, {
        algorithms: ['RS256'],
        audience: FIREBASE_PROJECT_ID,
        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
    });
};

// Extrae la identidad del usuario. Si viene un token Bearer, se VERIFICA
// criptográficamente y manda sobre cualquier cabecera. La cabecera x-user-id
// sola se acepta como fallback (entorno local sin salida a internet / tests).
const resolveIdentity = async (req) => {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
        try {
            const payload = await verifyFirebaseToken(authHeader.slice(7));
            return { uid: payload.sub || payload.user_id, verified: true };
        } catch (err) {
            // Si el fallo es de red al obtener certificados, degradamos al fallback;
            // si el token es inválido, rechazamos.
            if (!err.message.includes('Certs HTTP') && err.code !== 'ENOTFOUND' && !(err.cause)) {
                const e = new Error('Token inválido o caducado');
                e.status = 401;
                throw e;
            }
            console.warn('⚠️ No se pudieron obtener los certificados de Google, usando fallback x-user-id');
        }
    }
    const userId = req.headers['x-user-id'];
    if (!userId || userId === 'undefined') return null;
    return { uid: userId, verified: false };
};

const authenticateUser = async (req, res, next) => {
    try {
        const identity = await resolveIdentity(req);
        if (!identity) return res.status(401).json({ error: 'Usuario no identificado' });
        req.userId = identity.uid;
        req.identityVerified = identity.verified;
        next();
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

app.post('/api/auth/sync', async (req, res) => {
    const { uid: bodyUid, email, username } = req.body;
    if (!bodyUid) return res.status(400).json({ error: 'UID missing' });

    // Si llega token verificado, el UID real es el del token (evita suplantaciones)
    const identity = await resolveIdentity(req).catch(() => null);
    const uid = (identity && identity.verified) ? identity.uid : bodyUid;

    // 1. Limpiar registros "fantasmas": si el email existe con otro UID, lo borramos.
    // Solo con identidad verificada — de lo contrario cualquiera podría borrar
    // los datos de otro usuario enviando su email.
    if (email && identity && identity.verified) {
        await db.execute('DELETE FROM users WHERE email = ? AND id != ?', [email, uid]);
    }

    // 2. Sincronizar (Insert o Update si el UID coincide)
    await db.execute(
        `INSERT INTO users (id, username, email) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email)`,
        [uid, cleanParam(username) || (email ? email.split('@')[0] : 'usuario'), cleanParam(email)]
    );

    // 3. Asegurar perfil
    await db.execute('INSERT IGNORE INTO profiles (user_id, xp, level) VALUES (?, 0, 1)', [uid]);
    res.json({ success: true });
});

app.delete('/api/auth/account', authenticateUser, async (req, res) => {
    await db.execute('DELETE FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true });
});

// Normaliza el estado premium: si caducó con renovación activa se extiende
// (renovación simulada); si caducó sin renovación, se desactiva.
const normalizePremium = async (uid, profile) => {
    if (!profile || !profile.is_premium || !profile.premium_until) return profile;
    const expires = new Date(profile.premium_until);
    if (expires >= new Date()) return profile;

    if (profile.auto_renew) {
        await db.execute('UPDATE profiles SET premium_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE user_id = ?', [uid]);
    } else {
        await db.execute('UPDATE profiles SET is_premium = 0, premium_until = NULL WHERE user_id = ?', [uid]);
    }
    const [rows] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [uid]);
    return rows[0];
};

app.get('/api/profile', authenticateUser, async (req, res) => {
    const [profiles] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
    if (profiles.length === 0) return res.json(null);
    const profile = await normalizePremium(req.userId, profiles[0]);
    const [userData] = await db.execute('SELECT username, email FROM users WHERE id = ?', [req.userId]);
    res.json({ ...profile, ...userData[0] });
});

app.put('/api/profile', authenticateUser, async (req, res) => {
    const d = req.body;
    const uid = req.userId;

    // Cargar perfil actual para preservar campos no enviados
    const [current] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [uid]);
    const cur = current[0] || {};

    let startWeight = cur.start_weight;
    let startDate = cur.start_date;

    // Si se recibe un peso y no hay peso inicial, grabarlo como inicio
    if (!startWeight && d.current_weight) {
        startWeight = d.current_weight;
        startDate = localToday();
    }

    // Construir SET dinámico con solo los campos enviados
    const updates = {};
    if (d.age !== undefined) updates.age = cleanParam(d.age);
    if (d.gender !== undefined) updates.gender = cleanParam(d.gender);
    if (d.height !== undefined) updates.height = cleanParam(d.height);
    if (d.current_weight !== undefined) updates.current_weight = cleanParam(d.current_weight);
    if (d.target_weight !== undefined) updates.target_weight = cleanParam(d.target_weight);
    if (d.goal !== undefined) updates.goal = cleanParam(d.goal);
    if (d.activity_level !== undefined) updates.activity_level = cleanParam(d.activity_level);
    if (d.calories !== undefined) updates.calories = cleanParam(d.calories);
    if (d.xp !== undefined) updates.xp = d.xp;
    if (d.level !== undefined) updates.level = d.level;
    if (d.name !== undefined) updates.name = cleanParam(d.name);
    if (startWeight !== cur.start_weight) updates.start_weight = cleanParam(startWeight);
    if (startDate !== cur.start_date) updates.start_date = cleanParam(startDate);

    if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), uid];
        await db.execute(`UPDATE profiles SET ${setClauses} WHERE user_id = ?`, values);
    }

    if (d.username) {
        await db.execute('UPDATE users SET username = ? WHERE id = ?', [d.username, uid]);
    }

    const [updated] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [uid]);
    const [userBase] = await db.execute('SELECT username, email FROM users WHERE id = ?', [uid]);
    res.json({ ...updated[0], ...userBase[0] });
});

// DIARIO Y CHECKINS
app.get('/api/daily-checkin', authenticateUser, async (req, res) => {
    const today = localToday();
    const [checkins] = await db.execute('SELECT id, user_id, DATE_FORMAT(date, "%Y-%m-%d") as date, sleep, energy, stress, water, steps, mood FROM daily_checkins WHERE user_id = ? AND date = ?', [req.userId, today]);
    res.json(checkins[0] || null);
});

app.post('/api/daily-checkin', authenticateUser, async (req, res) => {
    const { date, sleep, energy, stress, water, steps, mood } = req.body;
    const today = date || localToday();
    await db.execute(
        `INSERT INTO daily_checkins (user_id, date, sleep, energy, stress, water, steps, mood)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sleep=VALUES(sleep), energy=VALUES(energy), stress=VALUES(stress), water=VALUES(water), steps=VALUES(steps), mood=VALUES(mood)`,
        [req.userId, today, cleanParam(sleep), cleanParam(energy), cleanParam(stress), water || 0, steps || 0, cleanParam(mood)]
    );
    res.json({ success: true });
});

app.get('/api/daily-log/:date', authenticateUser, async (req, res) => {
    const [meals] = await db.execute('SELECT id, user_id, DATE_FORMAT(date, "%Y-%m-%d") as date, name, calories, meal_type, protein, carbs, fat, created_at FROM meal_logs WHERE user_id = ? AND date = ?', [req.userId, req.params.date]);
    res.json(meals);
});

app.post('/api/daily-log', authenticateUser, async (req, res) => {
    const { date, name, calories, mealType, protein, carbs, fat } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Faltan nombre o fecha' });
    await db.execute(
        'INSERT INTO meal_logs (user_id, date, name, calories, meal_type, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.userId, date, name, calories || 0, mealType || 'snack', protein || 0, carbs || 0, fat || 0]
    );
    res.json({ success: true });
});

// VACIAR DIARIO COMPLETO (Debe ir antes de :id para evitar conflicto)
app.delete('/api/daily-log/all', authenticateUser, async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Falta la fecha' });

    const [result] = await db.query('DELETE FROM meal_logs WHERE user_id = ? AND date = ?', [req.userId, date]);
    res.json({ success: true, affectedRows: result.affectedRows });
});

app.delete('/api/daily-log/name/:name', authenticateUser, async (req, res) => {
    const { date } = req.query;
    await db.execute('DELETE FROM meal_logs WHERE user_id = ? AND name LIKE ? AND date = ?', [req.userId, `%${req.params.name}%`, date]);
    res.json({ success: true });
});

app.delete('/api/daily-log/:id', authenticateUser, async (req, res) => {
    await db.execute('DELETE FROM meal_logs WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
});

app.get('/api/shopping-list', authenticateUser, async (req, res) => {
    const [items] = await db.execute('SELECT * FROM shopping_items WHERE user_id = ?', [req.userId]);
    res.json(items);
});

app.post('/api/shopping-list', authenticateUser, async (req, res) => {
    await db.execute('INSERT INTO shopping_items (user_id, name) VALUES (?, ?)', [req.userId, cleanParam(req.body.name)]);
    res.json({ success: true });
});

// Reemplazo completo de la lista en UNA petición y UNA transacción.
// Sustituye al patrón anterior del frontend (DELETE + N POSTs), que era
// lento y dejaba la lista a medias si fallaba a mitad.
app.put('/api/shopping-list', authenticateUser, async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items debe ser un array' });

    const names = items.map(n => (typeof n === 'string' ? n.trim() : '')).filter(Boolean);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM shopping_items WHERE user_id = ?', [req.userId]);
        if (names.length > 0) {
            const placeholders = names.map(() => '(?, ?)').join(', ');
            const values = names.flatMap(name => [req.userId, name]);
            await connection.execute(`INSERT INTO shopping_items (user_id, name) VALUES ${placeholders}`, values);
        }
        await connection.commit();
        res.json({ success: true, count: names.length });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
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
    const [h] = await db.execute('SELECT id, user_id, DATE_FORMAT(date, "%Y-%m-%d") as date, weight FROM weight_history WHERE user_id = ? ORDER BY date ASC', [req.userId]);
    res.json(h);
});

app.post('/api/weight-history', authenticateUser, async (req, res) => {
    const { date, weight } = req.body;
    if (!date || weight === undefined || weight === null || isNaN(Number(weight))) {
        return res.status(400).json({ error: 'Fecha o peso no válidos' });
    }
    // Si ya existe registro ese día, se actualiza el peso
    await db.query(
        `INSERT INTO weight_history (user_id, date, weight)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE weight = VALUES(weight)`,
        [req.userId, date, weight]
    );
    res.json({ message: 'Peso guardado y actualizado' });
});

app.get('/api/streak', authenticateUser, async (req, res) => {
    const uid = req.userId;
    // Todas las fechas únicas con actividad, formateadas como YYYY-MM-DD
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

    const dates = [...new Set(rows.map(r => r.act_date))];

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

    // Si no hay actividad hoy ni ayer, la racha es 0
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
        return res.json({ streak: 0 });
    }

    let streak = 0;
    // Inicializar con la fecha de la última actividad real (forzando mediodía)
    const currentDate = new Date(dates[0] + 'T12:00:00');

    for (const dateStr of dates) {
        if (dateStr === getLocalDateStr(currentDate)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    res.json({ streak });
});

// ─── PREMIUM SYSTEM ──────────────────────────────────────────────────────────

app.post('/api/premium/subscribe', authenticateUser, async (req, res) => {
    // Simulación de pago: 30 días de premium y renovación activa
    const [result] = await db.execute(
        'UPDATE profiles SET is_premium = 1, auto_renew = 1, premium_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE user_id = ?',
        [req.userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'No se encontró el perfil del usuario.' });
    }

    res.json({ success: true, message: '¡Suscripción Premium activada!' });
});

// Endpoint para dar de baja la renovación
app.post('/api/premium/cancel', authenticateUser, async (req, res) => {
    await db.execute('UPDATE profiles SET auto_renew = 0 WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
});

// Endpoint para reactivar la renovación
app.post('/api/premium/reactivate', authenticateUser, async (req, res) => {
    await db.execute('UPDATE profiles SET auto_renew = 1 WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
});

// Endpoint para resetear TOTALMENTE (para pruebas/limpieza)
app.post('/api/premium/reset', authenticateUser, async (req, res) => {
    await db.execute('UPDATE profiles SET is_premium = 0, premium_until = NULL, auto_renew = 0 WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
});

app.post('/api/ai/chat', authenticateUser, async (req, res) => {
    try {
        // 1. Verificar suscripción Premium (con renovación/caducidad normalizada)
        const [profiles] = await db.execute('SELECT is_premium, premium_until, auto_renew FROM profiles WHERE user_id = ?', [req.userId]);
        const authProfile = await normalizePremium(req.userId, profiles[0]);

        if (!authProfile?.is_premium) {
            return res.status(403).json({
                error: 'Premium Required',
                message: 'El acceso al NutriCoach IA es exclusivo para usuarios Premium. ¡Suscríbete para continuar!'
            });
        }

        const { userMessage, context } = req.body;
        if (!userMessage || !context) return res.status(400).json({ error: 'Falta el mensaje o el contexto' });
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
            model: "gemini-2.5-flash",
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        });

        // Gemini API EXIGE que el historial termine con 'model' y empiece con 'user' alternándose.
        // Recorremos el historial hacia atrás para extraer mensajes válidos alternados.
        const validHistory = [];
        let expectedRole = 'model'; // chat.sendMessage() mandará 'user', el historial DEBE acabar en 'model'.
        // Limitar el historial enviado: 20 mensajes bastan de contexto y reducen coste/latencia
        const rawHistory = (context.chatHistory || []).slice(-20);

        for (let i = rawHistory.length - 1; i >= 0; i--) {
            const role = rawHistory[i].sender === 'user' ? 'user' : 'model';
            if (role === expectedRole) {
                validHistory.unshift({ role, parts: [{ text: rawHistory[i].text }] });
                expectedRole = expectedRole === 'model' ? 'user' : 'model';
            }
        }

        // Gemini EXIGE que el historial empiece por 'user'.
        while (validHistory.length > 0 && validHistory[0].role !== 'user') {
            validHistory.shift();
        }

        const chat = model.startChat({ history: validHistory });

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
        - protein: Número entero de gramos de proteína
        - carbs: Número entero de gramos de carbohidratos
        - fat: Número entero de gramos de grasa
        - reason: Por qué es buena para hoy
        - ingredients: Array de strings con los ingredientes
        - mealType: "desayuno", "comida", "snack" o "cena"
        - tags: Array de strings (ej. "alto en proteína")`;

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest", "gemini-pro-latest"];
        let result;
        let lastError;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(systemPrompt);
                break; // Éxito: salimos del bucle
            } catch (err) {
                console.warn(`[GEMINI] Error con ${modelName}:`, err.message);
                lastError = err;
            }
        }

        if (!result) {
            throw lastError;
        }

        const responseText = result.response.text();
        const match = responseText.match(/\[[\s\S]*\]/);

        if (!match) {
            throw new Error("Formato JSON no válido en la respuesta del Chef.");
        }

        const menu = JSON.parse(match[0]);
        const sanitizedMenu = menu.map(item => ({
            ...item,
            calories: parseInt(item.calories, 10) || 0,
            protein: parseInt(item.protein, 10) || 0,
            carbs: parseInt(item.carbs, 10) || 0,
            fat: parseInt(item.fat, 10) || 0
        }));
        res.json({ menu: sanitizedMenu });
    } catch (error) {
        console.error("Gemini Menu Error:", error);
        res.status(500).json({ error: "Error de alta demanda en los servidores de Google. Por favor, inténtalo de nuevo en unos segundos." });
    }
});

app.post('/api/ai/analyze', authenticateUser, async (req, res) => {
    res.status(501).json({ error: "Not implemented" });
});

// 404 para rutas desconocidas de la API
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador global de errores (Express 5 enruta aquí las promesas rechazadas)
app.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const server = app.listen(PORT, () => console.log(`🚀 Backend Híbrido V2 en http://localhost:${PORT}`));

module.exports = { app, db, server };
