const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Auth Middleware Tests', () => {
  describe('Protección de rutas', () => {
    it('debería rechazar solicitud sin token', async () => {
      await request(app)
        .get('/api/formularios')
        .expect(401);
    });

    it('debería rechazar solicitud con token inválido', async () => {
      await request(app)
        .get('/api/formularios')
        .set('x-auth-token', 'token-invalido')
        .expect(401);
    });

    it('debería rechazar solicitud con token expirado', async () => {
      const expiredToken = jwt.sign(
        { id: 'test-id', empresaId: 'test-empresa' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/api/formularios')
        .set('x-auth-token', expiredToken)
        .expect(401);
    });

    it('debería aceptar solicitud con token válido', async () => {
      const testUser = new User({
        nombre: 'Usuario Test',
        email: 'test-auth@example.com',
        password: 'password123',
        rol: 'gerente',
        empresaId: 'test-empresa'
      });
      await testUser.save();

      const validToken = jwt.sign(
        { id: testUser._id, empresaId: 'test-empresa' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .get('/api/formularios')
        .set('x-auth-token', validToken)
        .expect(200);
    });
  });

  describe('Inyección de req.user', () => {
    it('debería inyectar correctamente el usuario en req.user', async () => {
      const testUser = new User({
        nombre: 'Usuario Inyección',
        email: 'test-injection@example.com',
        password: 'password123',
        rol: 'empleado',
        empresaId: 'inyection-empresa'
      });
      await testUser.save();

      const token = jwt.sign(
        { id: testUser._id, empresaId: 'inyection-empresa', nombre: testUser.nombre },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Crear una ruta de prueba para verificar la inyección
      app.get('/test-auth', (req, res) => {
        if (req.user && req.user.id && req.user.empresaId) {
          res.json({ 
            success: true, 
            userId: req.user.id,
            empresaId: req.user.empresaId 
          });
        } else {
          res.json({ success: false });
        }
      });

      const response = await request(app)
        .get('/test-auth')
        .set('x-auth-token', token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(testUser._id.toString());
      expect(response.body.empresaId).toBe('inyection-empresa');
    });
  });
});
