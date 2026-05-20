const mysql = require('mysql2');

async function debug() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'nutriamigo'
    }).promise();

    const uid = 'UFb41W1WrfhHZtubN20SNUV7Ct22';

    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT act_date FROM (
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM weight_history WHERE user_id = ?
                UNION
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM daily_checkins WHERE user_id = ?
                UNION
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as act_date FROM meal_logs WHERE user_id = ?
            ) as activity
            ORDER BY act_date DESC
        `, [uid, uid, uid]);
        console.log("Activity Dates for user:", rows);

        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalDateStr(new Date());
        console.log("Today Local:", todayStr);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debug();
