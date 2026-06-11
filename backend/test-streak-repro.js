const { app, db } = require('./index');
const request = require('supertest');

async function test() {
    const uid = 'test_streak_user_' + Date.now();
    await db.execute('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [uid, 'test', uid + '@test.com']);
    await db.execute('INSERT INTO profiles (user_id, xp, level) VALUES (?, 0, 1)', [uid]);
    
    // 1st time
    await request(app).post('/api/weight-history').set('x-user-id', uid).send({ date: '2026-06-10', weight: 80 });
    let res = await request(app).get('/api/streak').set('x-user-id', uid);
    console.log("Streak after 1st weight:", res.body.streak);
    
    // 2nd time
    await request(app).post('/api/weight-history').set('x-user-id', uid).send({ date: '2026-06-10', weight: 79 });
    res = await request(app).get('/api/streak').set('x-user-id', uid);
    console.log("Streak after 2nd weight:", res.body.streak);

    process.exit();
}
test();
