const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Formulario = require('../models/Formulario');
const jwt = require('jsonwebtoken');

describe('FormController Tests', () => {
  let token;
  let testUser;
  let testEmpresaId = 'test-empresa-123';

  beforeAll(async () => {
    // Crear usuario de prueba
    testUser = new User({
      nombre: 'Usuario Test',
      email: 'test@example.com',
      password: 'password123',
      rol: 'gerente',
      empresaId: testEmpresaId
    });
    await testUser.save();

    // Generar token JWT
    token = jwt.sign(
      { id: testUser._id, empresaId: testEmpresaId },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('POST /api/formularios', () => {
    it('debería crear un formulario exitosamente', async () => {
      const formData = {
        titulo: 'Formulario de Prueba',
        campos: [
          {
            label: 'Campo Texto',
            tipo: 'text',
            requerido: true
          }
        ]
      };

      const response = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', token)
        .send(formData)
        .expect(201);

      expect(response.body.msg).toBe('Formulario guardado con éxito');
      expect(response.body.data.titulo).toBe(formData.titulo);
      expect(response.body.data.empresaId).toBe(testEmpresaId);
    });

    it('debería rechazar formulario sin título', async () => {
      const formData = {
        titulo: '',
        campos: [{ label: 'Campo', tipo: 'text', requerido: true }]
      };

      const response = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', token)
        .send(formData)
        .expect(400);

      expect(response.body.msg).toBe('El título del formulario es requerido');
    });

    it('debería rechazar formulario sin campos', async () => {
      const formData = {
        titulo: 'Formulario sin campos',
        campos: []
      };

      const response = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', token)
        .send(formData)
        .expect(400);

      expect(response.body.msg).toBe('Los campos del formulario son requeridos');
    });

    it('debería rechazar solicitud sin token', async () => {
      const formData = {
        titulo: 'Formulario Test',
        campos: [{ label: 'Campo', tipo: 'text', requerido: true }]
      };

      await request(app)
        .post('/api/formularios')
        .send(formData)
        .expect(401);
    });
  });

  describe('GET /api/formularios', () => {
    beforeEach(async () => {
      // Crear formularios de prueba
      await Formulario.create([
        {
          titulo: 'Formulario 1',
          campos: [{ label: 'Campo1', tipo: 'text' }],
          empresaId: testEmpresaId
        },
        {
          titulo: 'Formulario 2',
          campos: [{ label: 'Campo2', tipo: 'text' }],
          empresaId: 'otra-empresa'
        }
      ]);
    });

    it('debería obtener solo formularios de la empresa del usuario', async () => {
      const response = await request(app)
        .get('/api/formularios')
        .set('x-auth-token', token)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].empresaId).toBe(testEmpresaId);
    });

    it('debería rechazar solicitud sin token', async () => {
      await request(app)
        .get('/api/formularios')
        .expect(401);
    });
  });

  describe('GET /api/formularios/:id', () => {
    let testFormulario;

    beforeEach(async () => {
      testFormulario = await Formulario.create({
        titulo: 'Formulario Test',
        campos: [{ label: 'Campo', tipo: 'text' }],
        empresaId: testEmpresaId
      });
    });

    it('debería obtener formulario por ID', async () => {
      const response = await request(app)
        .get(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', token)
        .expect(200);

      expect(response.body._id).toBe(testFormulario._id.toString());
      expect(response.body.titulo).toBe('Formulario Test');
    });

    it('debería rechazar acceso a formulario de otra empresa', async () => {
      // Crear usuario de otra empresa
      const otherUser = new User({
        nombre: 'Otro Usuario',
        email: 'other@example.com',
        password: 'password123',
        rol: 'gerente',
        empresaId: 'otra-empresa'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id, empresaId: 'otra-empresa' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .get(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', otherToken)
        .expect(404);
    });

    it('debería retornar 404 para ID inválido', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/formularios/${fakeId}`)
        .set('x-auth-token', token)
        .expect(404);
    });
  });

  describe('PUT /api/formularios/:id', () => {
    let testFormulario;

    beforeEach(async () => {
      testFormulario = await Formulario.create({
        titulo: 'Formulario Original',
        campos: [{ label: 'Campo Original', tipo: 'text' }],
        empresaId: testEmpresaId
      });
    });

    it('debería actualizar formulario exitosamente', async () => {
      const updateData = {
        titulo: 'Formulario Actualizado',
        campos: [{ label: 'Campo Actualizado', tipo: 'text' }]
      };

      const response = await request(app)
        .put(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', token)
        .send(updateData)
        .expect(200);

      expect(response.body.titulo).toBe(updateData.titulo);
    });

    it('debería rechazar actualización de formulario de otra empresa', async () => {
      const otherUser = new User({
        nombre: 'Otro Usuario',
        email: 'other2@example.com',
        password: 'password123',
        rol: 'gerente',
        empresaId: 'otra-empresa'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id, empresaId: 'otra-empresa' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .put(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', otherToken)
        .send({ titulo: 'Hackeado' })
        .expect(401);
    });
  });

  describe('DELETE /api/formularios/:id', () => {
    let testFormulario;

    beforeEach(async () => {
      testFormulario = await Formulario.create({
        titulo: 'Formulario para Eliminar',
        campos: [{ label: 'Campo', tipo: 'text' }],
        empresaId: testEmpresaId
      });
    });

    it('debería eliminar formulario exitosamente', async () => {
      await request(app)
        .delete(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', token)
        .expect(200);

      const deletedForm = await Formulario.findById(testFormulario._id);
      expect(deletedForm).toBeNull();
    });

    it('debería rechazar eliminación de formulario de otra empresa', async () => {
      const otherUser = new User({
        nombre: 'Otro Usuario',
        email: 'other3@example.com',
        password: 'password123',
        rol: 'gerente',
        empresaId: 'otra-empresa'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id, empresaId: 'otra-empresa' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .delete(`/api/formularios/${testFormulario._id}`)
        .set('x-auth-token', otherToken)
        .expect(401);
    });
  });
});
