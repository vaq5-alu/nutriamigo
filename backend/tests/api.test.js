const request = require('supertest');
const { app, db, server } = require('../index');

afterAll(async () => {
    await db.end(); // Cierra la conexión a MySQL
    server.close(); // Cierra el servidor
});

describe('Pruebas Unitarias y de Integración - API NutrIAmigo', () => {
    
    // Prueba 1: Endpoint de Salud
    test('Debe responder 200 OK en el endpoint de salud', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    // Prueba 2: Middleware de Autenticación
    test('Debe rechazar peticiones sin cabecera x-user-id', async () => {
        const response = await request(app).get('/api/profile');
        expect(response.statusCode).toBe(401);
    });

    // Prueba 3: Estructura de sincronización
    test('Debe devolver error si falta el UID en la sincronización', async () => {
        const response = await request(app)
            .post('/api/auth/sync')
            .send({ email: 'test@example.com' });
        expect(response.statusCode).toBe(400);
    });
});
