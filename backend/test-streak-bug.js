const mysql = require('mysql2/promise');
async function test() {
    const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'nutriamigo' });
    try {
        const uid = 'streak_test_user';
        await db.execute('DELETE FROM users WHERE id = ?', [uid]);
        await db.execute('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [uid, 'test', 'test@test.com']);
        
        await db.query(`INSERT INTO weight_history (user_id, date, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = VALUES(weight)`, [uid, '2026-06-10', 80]);
        await db.query(`INSERT INTO weight_history (user_id, date, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = VALUES(weight)`, [uid, '2026-06-10', 79]);
        
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
        console.log("DATES:", rows);
        
        if (rows.length === 0) { console.log("Streak: 0"); return; }
        const dates = rows.map(r => r.act_date);
        const getLocalDateStr = (d) => { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
        let streak = 0;
        let currentDate = new Date(dates[0] + 'T12:00:00');
        for (let i = 0; i < dates.length; i++) {
            const expectedDateStr = getLocalDateStr(currentDate);
            if (dates[i] === expectedDateStr) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else { break; }
        }
        console.log("Final Streak:", streak);
    } catch(e) { console.error(e); } finally { await db.end(); }
}
test();
