// Pruebas simples que no dependen de la base de datos
const request = require('supertest');
const app = require('../server');

describe('Pruebas Básicas del Servidor', () => {
  test('debería responder a rutas no existentes con 404', async () => {
    await request(app)
      .get('/api/ruta-inexistente')
      .expect(404);
  });

  test('debería rechazar rutas protegidas sin token', async () => {
    await request(app)
      .get('/api/formularios')
      .expect(401);
  });

  test('debería rechazar rutas protegidas con token inválido', async () => {
    await request(app)
      .get('/api/formularios')
      .set('x-auth-token', 'token-invalido')
      .expect(401);
  });
});

describe('Middleware de CORS', () => {
  test('debería incluir headers CORS', async () => {
    const response = await request(app)
      .get('/api/ruta-inexistente')
      .expect(404);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
