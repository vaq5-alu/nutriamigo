const http = require('https');

const options = {
  hostname: 'nutriamigo-api.onrender.com',
  port: 443,
  path: '/api/profile',
  method: 'GET',
  headers: {
    'x-user-id': 'victorartolaquereda'
  }
};

const numRequests = 50;
let completed = 0;
const start = Date.now();

console.log(`🚀 Iniciando prueba de carga: ${numRequests} peticiones simultáneas a Render...`);

for (let i = 0; i < numRequests; i++) {
  const req = http.request(options, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      completed++;
      if (completed === numRequests) {
        const end = Date.now();
        console.log(`\n✅ PRUEBA COMPLETADA`);
        console.log(`Total peticiones: ${numRequests}`);
        console.log(`Tiempo total: ${end - start}ms`);
        console.log(`Media por petición: ${(end - start) / numRequests}ms`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error en petición ${i}: ${e.message}`);
  });
  req.end();
}
