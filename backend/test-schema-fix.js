const db = require('./db');
async function test() {
    try {
        const [rows] = await db.execute("SHOW INDEXES FROM weight_history");
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
