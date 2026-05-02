/**
 * TESTS COMPLETOS API v1.0 - FormBuilder SaaS
 * Cobertura: Auth, Perfil, Usuarios, Formularios, Respuestas, Branding, Empresa
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Ajusta según tu estructura
const User = require('../models/User');
const Empresa = require('../models/Empresa');
const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta');
const Plan = require('../models/Plan');
const fs = require('fs');
const path = require('path');

// Mock data
let tokens = {};
let testData = {
  empresa: null,
  formulario: null,
  respuesta: null,
  usuarioEmpleado: null
};

// ==================== SETUP ====================
beforeAll(async () => {
  // Crear plan de prueba si no existe
  let plan = await Plan.findOne({ slug: 'plan-test' });
  if (!plan) {
    plan = await Plan.create({
      nombre: 'Plan Test',
      slug: 'plan-test',
      descripcion: 'Plan para testing',
      precioMensual: 10,
      precioAnual: 100,
      caracteristicas: {
        maxUsuarios: 10,
        maxFormularios: 20,
        maxRespuestas: 1000,
        almacenamientoGB: 1
      }
    });
  }

  // Crear empresa de prueba
  testData.empresa = await Empresa.create({
    empresaId: 'empresa-test-' + Date.now(),
    nombre: 'Empresa Test',
    slug: 'empresa-test',
    status: 'activa',
    plan: {
      id: plan._id,
      nombre: 'Plan Test',
      precio: 10,
      limites: {
        usuarios: 10,
        formularios: 20,
        storage: 1024,
        respuestas: 1000
      }
    },
    usados: {
      usuarios: 0,
      formularios: 0,
      storage: 0,
      respuestas: 0
    },
    branding: {
      nombreApp: 'Test App',
      colorPrimario: '#3B82F6',
      colorSecundario: '#1E293B'
    }
  });

  // Crear usuarios de prueba
  const gerente = await User.create({
    nombre: 'Gerente Test',
    email: 'gerente@test.com',
    password: 'test123',
    rol: 'gerente',
    empresaId: testData.empresa.empresaId,
    activo: true
  });

  const empleado = await User.create({
    nombre: 'Empleado Test',
    email: 'empleado@test.com',
    password: 'test123',
    rol: 'empleado',
    empresaId: testData.empresa.empresaId,
    activo: true
  });

  testData.usuarioEmpleado = empleado;
});

afterAll(async () => {
  // Cleanup
  await User.deleteMany({ email: { $in: ['gerente@test.com', 'empleado@test.com', 'nuevo@test.com'] } });
  await Empresa.deleteMany({ slug: { $regex: /^empresa-test/ } });
  await Formulario.deleteMany({ empresaId: { $regex: /^empresa-test/ } });
  await Respuesta.deleteMany({ empresaId: { $regex: /^empresa-test/ } });
  await mongoose.connection.close();
});

// ==================== HELPERS ====================
const login = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token;
};

// ==================== 1. AUTENTICACIÓN ====================
describe('🔐 AUTH /api/auth', () => {

  describe('POST /api/auth/login', () => {
    it('✅ debe retornar token y datos de usuario con empresa completa', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gerente@test.com',
          password: 'test123'
        });

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toHaveProperty('rol', 'gerente');
      expect(res.body.user).toHaveProperty('empresaId');
      expect(res.body.user).toHaveProperty('empresa');
      expect(res.body.user.empresa).toHaveProperty('plan');
      expect(res.body.user.empresa).toHaveProperty('branding');

      tokens.gerente = res.body.token;
    });

    it('❌ debe rechazar credenciales inválidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gerente@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('❌ debe rechazar email no registrado', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@test.com',
          password: 'test123'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('✅ debe verificar token válido', async () => {
      const token = await login('gerente@test.com', 'test123');

      const res = await request(app)
        .get('/api/auth/verify')
        .set('x-auth-token', token);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.valido).toBe(true);
      expect(res.body.user).toBeDefined();
    });

    it('❌ debe rechazar token inválido', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('x-auth-token', 'token-invalido');

      expect(res.status).toBe(401);
    });

    it('❌ debe rechazar sin token', async () => {
      const res = await request(app)
        .get('/api/auth/verify');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_MISSING');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('✅ debe cerrar sesión correctamente', async () => {
      const token = await login('gerente@test.com', 'test123');

      const res = await request(app)
        .post('/api/auth/logout')
        .set('x-auth-token', token);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });
});

// ==================== 2. PERFIL ====================
describe('👤 PERFIL /api/usuarios/perfil', () => {
  let token;

  beforeAll(async () => {
    token = await login('gerente@test.com', 'test123');
  });

  describe('GET /api/usuarios/perfil', () => {
    it('✅ debe obtener perfil del usuario logueado', async () => {
      const res = await request(app)
        .get('/api/usuarios/perfil')
        .set('x-auth-token', token);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('nombre');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('rol');
      expect(res.body.data).toHaveProperty('perfil');
      expect(res.body.data).toHaveProperty('configuracion');
    });
  });

  describe('PUT /api/usuarios/perfil', () => {
    it('✅ debe actualizar perfil', async () => {
      const res = await request(app)
        .put('/api/usuarios/perfil')
        .set('x-auth-token', token)
        .send({
          nombre: 'Gerente Actualizado',
          perfil: {
            dni: '12345678',
            telefono: '+51 999 888 777',
            departamento: 'Operaciones',
            cargo: 'Supervisor'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data.nombre).toBe('Gerente Actualizado');
    });
  });

  describe('PUT /api/usuarios/password', () => {
    it('✅ debe cambiar contraseña', async () => {
      const res = await request(app)
        .put('/api/usuarios/password')
        .set('x-auth-token', token)
        .send({
          passwordActual: 'test123',
          passwordNuevo: 'newpass456'
        });

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });

    it('❌ debe rechazar contraseña actual incorrecta', async () => {
      const res = await request(app)
        .put('/api/usuarios/password')
        .set('x-auth-token', token)
        .send({
          passwordActual: 'wrongpass',
          passwordNuevo: 'newpass789'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });
  });

  describe('POST /api/usuarios/perfil/foto', () => {
    it('✅ debe subir foto de perfil', async () => {
      // Crear archivo temporal de prueba
      const testFile = path.join(__dirname, 'test-image.png');
      fs.writeFileSync(testFile, Buffer.from('fake-image-data'));

      const res = await request(app)
        .post('/api/usuarios/perfil/foto')
        .set('x-auth-token', token)
        .attach('fotoPerfil', testFile);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body).toHaveProperty('fotoUrl');

      // Cleanup
      fs.unlinkSync(testFile);
    });
  });
});

// ==================== 3. GESTIÓN DE EQUIPO ====================
describe('👥 GESTIÓN DE EQUIPO /api/usuarios', () => {
  let tokenGerente;
  let tokenEmpleado;

  beforeAll(async () => {
    tokenGerente = await login('gerente@test.com', 'newpass456');
    tokenEmpleado = await login('empleado@test.com', 'test123');
  });

  describe('GET /api/usuarios/equipo', () => {
    it('✅ gerente debe listar equipo de su empresa', async () => {
      const res = await request(app)
        .get('/api/usuarios/equipo')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('✅ empleado debe poder ver equipo (solo lectura)', async () => {
      const res = await request(app)
        .get('/api/usuarios/equipo')
        .set('x-auth-token', tokenEmpleado);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });

  describe('POST /api/usuarios/registro-equipo', () => {
    it('✅ gerente debe crear usuario en su empresa', async () => {
      const res = await request(app)
        .post('/api/usuarios/registro-equipo')
        .set('x-auth-token', tokenGerente)
        .send({
          nombre: 'Nuevo Empleado',
          email: 'nuevo@test.com',
          password: 'temporal123',
          rol: 'empleado'
        });

      expect(res.status).toBe(201);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('rol', 'empleado');
    });

    it('❌ debe rechazar crear usuario con email duplicado', async () => {
      const res = await request(app)
        .post('/api/usuarios/registro-equipo')
        .set('x-auth-token', tokenGerente)
        .send({
          nombre: 'Otro Empleado',
          email: 'nuevo@test.com', // Email ya existe
          password: 'temporal123',
          rol: 'empleado'
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('❌ empleado no debe poder crear usuarios', async () => {
      const res = await request(app)
        .post('/api/usuarios/registro-equipo')
        .set('x-auth-token', tokenEmpleado)
        .send({
          nombre: 'No Debe Crearse',
          email: 'nodeberia@test.com',
          password: 'test123',
          rol: 'empleado'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/usuarios/:id', () => {
    it('✅ gerente debe poder desactivar usuario', async () => {
      const usuario = await User.findOne({ email: 'nuevo@test.com' });

      const res = await request(app)
        .delete(`/api/usuarios/${usuario._id}`)
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });
});

// ==================== 4. FORMULARIOS ====================
describe('📋 FORMULARIOS /api/formularios', () => {
  let tokenGerente;
  let tokenEmpleado;

  beforeAll(async () => {
    tokenGerente = await login('gerente@test.com', 'newpass456');
    tokenEmpleado = await login('empleado@test.com', 'test123');
  });

  describe('POST /api/formularios', () => {
    it('✅ gerente debe crear formulario con 14 tipos de campos', async () => {
      const res = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', tokenGerente)
        .send({
          titulo: 'Formulario de Prueba Completo',
          descripcion: 'Test de todos los tipos de campos',
          campos: [
            { id: 'campo_001', tipo: 'texto_corto', label: 'Nombre', requerido: true, placeholder: 'Ej: Juan' },
            { id: 'campo_002', tipo: 'texto_largo', label: 'Descripción', requerido: false, maxLength: 500 },
            { id: 'campo_003', tipo: 'numero', label: 'Edad', requerido: true, min: 0, max: 120 },
            { id: 'campo_004', tipo: 'email', label: 'Correo', requerido: true },
            { id: 'campo_005', tipo: 'foto', label: 'Foto de perfil', requerido: true },
            { id: 'campo_006', tipo: 'video', label: 'Video evidencia', requerido: false },
            { id: 'campo_007', tipo: 'gps', label: 'Ubicación', requerido: false },
            { id: 'campo_008', tipo: 'adjunto', label: 'Documento', requerido: false, tiposPermitidos: ['pdf', 'doc'] },
            { id: 'campo_009', tipo: 'radio', label: 'Género', requerido: true, opciones: ['Masculino', 'Femenino', 'Otro'] },
            { id: 'campo_010', tipo: 'multiple', label: 'Intereses', requerido: false, opciones: ['Deportes', 'Música', 'Tecnología'] },
            { id: 'campo_011', tipo: 'dropdown', label: 'País', requerido: true, opciones: ['México', 'Colombia', 'Perú'] },
            { id: 'campo_012', tipo: 'escala', label: 'Satisfacción', requerido: true, escalaConfig: { min: 1, max: 5, etiquetaMin: 'Muy insatisfecho', etiquetaMax: 'Muy satisfecho' } },
            { id: 'campo_013', tipo: 'cuadricula_unica', label: 'Evaluación', requerido: true, filas: ['Calidad', 'Servicio'], columnas: ['Excelente', 'Bueno', 'Regular'] },
            { id: 'campo_014', tipo: 'cuadricula_multiple', label: 'Preferencias', requerido: false, filas: ['Opción A', 'Opción B'], columnas: ['Sí', 'No', 'Tal vez'] }
          ],
          esPlantilla: false
        });

      expect(res.status).toBe(201);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.campos).toHaveLength(14);

      testData.formulario = res.body.data;
    });

    it('❌ debe rechazar formulario sin campos', async () => {
      const res = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', tokenGerente)
        .send({
          titulo: 'Formulario vacío',
          campos: []
        });

      expect(res.status).toBe(400);
    });

    it('❌ empleado no debe poder crear formularios', async () => {
      const res = await request(app)
        .post('/api/formularios')
        .set('x-auth-token', tokenEmpleado)
        .send({
          titulo: 'No debe crear',
          campos: [{ id: 'campo_001', tipo: 'texto_corto', label: 'Test', requerido: true }]
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/formularios', () => {
    it('✅ debe listar formularios de la empresa', async () => {
      const res = await request(app)
        .get('/api/formularios')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ debe filtrar por activo=true', async () => {
      const res = await request(app)
        .get('/api/formularios?activo=true')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });

  describe('GET /api/formularios/:id', () => {
    it('✅ debe obtener formulario por ID', async () => {
      const res = await request(app)
        .get(`/api/formularios/${testData.formulario._id}`)
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('_id', testData.formulario._id);
    });

    it('❌ debe retornar 404 para formulario inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/formularios/${fakeId}`)
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/formularios/:id', () => {
    it('✅ debe actualizar formulario', async () => {
      const res = await request(app)
        .put(`/api/formularios/${testData.formulario._id}`)
        .set('x-auth-token', tokenGerente)
        .send({
          titulo: 'Formulario Actualizado',
          descripcion: 'Nueva descripción'
        });

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data.titulo).toBe('Formulario Actualizado');
    });
  });

  describe('PATCH /api/formularios/:id/activar', () => {
    it('✅ debe activar/desactivar formulario', async () => {
      const res = await request(app)
        .patch(`/api/formularios/${testData.formulario._id}/activar`)
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('activo');
    });
  });
});

// ==================== 5. RESPUESTAS (CRÍTICO) ====================
describe('📤 RESPUESTAS /api/respuestas (CRÍTICO - Multipart)', () => {
  let tokenEmpleado;

  beforeAll(async () => {
    tokenEmpleado = await login('empleado@test.com', 'test123');
  });

  describe('POST /api/respuestas', () => {
    it('✅ debe enviar respuesta con datos JSON', async () => {
      const res = await request(app)
        .post('/api/respuestas')
        .set('x-auth-token', tokenEmpleado)
        .field('empresaId', testData.empresa.empresaId)
        .field('formularioId', testData.formulario._id)
        .field('datos', JSON.stringify({
          campo_001: 'Juan Pérez',
          campo_002: 'Esta es una descripción de prueba',
          campo_003: 25,
          campo_004: 'test@test.com',
          campo_007: '19.4326, -99.1332',
          campo_009: 'Masculino',
          campo_010: ['Deportes', 'Música'],
          campo_011: 'México',
          campo_012: 4,
          campo_013: { Calidad: 'Excelente', Servicio: 'Bueno' }
        }));

      expect(res.status).toBe(201);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('_id');

      testData.respuesta = res.body.data;
    });

    it('✅ debe enviar respuesta con archivos (multipart)', async () => {
      // Crear archivos temporales de prueba
      const fotoPath = path.join(__dirname, 'test-foto.jpg');
      const videoPath = path.join(__dirname, 'test-video.mp4');
      fs.writeFileSync(fotoPath, Buffer.from('fake-foto-data'));
      fs.writeFileSync(videoPath, Buffer.from('fake-video-data'));

      const res = await request(app)
        .post('/api/respuestas')
        .set('x-auth-token', tokenEmpleado)
        .field('empresaId', testData.empresa.empresaId)
        .field('formularioId', testData.formulario._id)
        .field('datos', JSON.stringify({
          campo_001: 'Usuario con archivos',
          campo_005: 'ruta-se-actualiza-automaticamente',
          campo_006: 'ruta-se-actualiza-automaticamente'
        }))
        .attach('campo_005', fotoPath)  // El nombre del campo debe coincidir con campoId
        .attach('campo_006', videoPath);

      expect(res.status).toBe(201);
      expect(res.body.exito).toBe(true);
      expect(res.body.data.archivosSubidos).toBeGreaterThanOrEqual(0);

      // Cleanup
      fs.unlinkSync(fotoPath);
      fs.unlinkSync(videoPath);
    });

    it('❌ debe rechazar sin datos requeridos', async () => {
      const res = await request(app)
        .post('/api/respuestas')
        .set('x-auth-token', tokenEmpleado)
        .field('empresaId', testData.empresa.empresaId);
      // Falta formularioId y datos

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/respuestas', () => {
    it('✅ debe listar respuestas de la empresa', async () => {
      const res = await request(app)
        .get('/api/respuestas')
        .set('x-auth-token', tokenEmpleado);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ debe filtrar por formularioId', async () => {
      const res = await request(app)
        .get(`/api/respuestas?formularioId=${testData.formulario._id}`)
        .set('x-auth-token', tokenEmpleado);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });

  describe('GET /api/respuestas/:id', () => {
    it('✅ debe obtener respuesta específica', async () => {
      const res = await request(app)
        .get(`/api/respuestas/${testData.respuesta._id}`)
        .set('x-auth-token', tokenEmpleado);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('datos');
    });
  });

  describe('DELETE /api/respuestas/:id', () => {
    it('✅ debe eliminar respuesta', async () => {
      const res = await request(app)
        .delete(`/api/respuestas/${testData.respuesta._id}`)
        .set('x-auth-token', tokenEmpleado);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
    });
  });
});

// ==================== 6. BRANDING ====================
describe('🎨 BRANDING /api/empresa', () => {
  let tokenGerente;

  beforeAll(async () => {
    tokenGerente = await login('gerente@test.com', 'newpass456');
  });

  describe('GET /api/empresa/branding', () => {
    it('✅ debe obtener branding de la empresa', async () => {
      const res = await request(app)
        .get('/api/empresa/branding')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('nombreApp');
      expect(res.body.data).toHaveProperty('colorPrimario');
      expect(res.body.data).toHaveProperty('colorSecundario');
    });
  });

  describe('PUT /api/empresa/branding', () => {
    it('✅ debe actualizar branding', async () => {
      const res = await request(app)
        .put('/api/empresa/branding')
        .set('x-auth-token', tokenGerente)
        .send({
          nombreApp: 'Nueva App Name',
          colorPrimario: '#EF4444',
          colorSecundario: '#1E293B'
        });

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data.colorPrimario).toBe('#EF4444');
    });

    it('❌ debe rechazar color hexadecimal inválido', async () => {
      const res = await request(app)
        .put('/api/empresa/branding')
        .set('x-auth-token', tokenGerente)
        .send({
          colorPrimario: 'invalid-color'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_COLOR');
    });
  });

  describe('POST /api/empresa/logo', () => {
    it('✅ debe subir logo (multipart)', async () => {
      const logoPath = path.join(__dirname, 'test-logo.png');
      fs.writeFileSync(logoPath, Buffer.from('fake-logo-data'));

      const res = await request(app)
        .post('/api/empresa/logo')
        .set('x-auth-token', tokenGerente)
        .attach('logoFile', logoPath);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body).toHaveProperty('logoUrl');

      fs.unlinkSync(logoPath);
    });
  });
});

// ==================== 7. USO Y LÍMITES ====================
describe('📊 USO Y LÍMITES /api/empresa', () => {
  let tokenGerente;

  beforeAll(async () => {
    tokenGerente = await login('gerente@test.com', 'newpass456');
  });

  describe('GET /api/empresa/usage', () => {
    it('✅ debe obtener estadísticas de uso', async () => {
      const res = await request(app)
        .get('/api/empresa/usage')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('usados');
      expect(res.body.data).toHaveProperty('limites');
      expect(res.body.data).toHaveProperty('porcentajes');
    });
  });

  describe('GET /api/empresa/limits', () => {
    it('✅ debe obtener límites del plan', async () => {
      const res = await request(app)
        .get('/api/empresa/limits')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.data).toHaveProperty('plan');
      expect(res.body.data.plan).toHaveProperty('limites');
    });
  });
});

// ==================== 8. PAGOS ====================
describe('💰 PAGOS /api/empresa', () => {
  let tokenGerente;

  beforeAll(async () => {
    tokenGerente = await login('gerente@test.com', 'newpass456');
  });

  describe('GET /api/empresa/pagos', () => {
    it('✅ debe obtener historial de pagos', async () => {
      const res = await request(app)
        .get('/api/empresa/pagos')
        .set('x-auth-token', tokenGerente);

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

// ==================== 9. CÓDIGOS DE ERROR ====================
describe('❌ MANEJO DE ERRORES', () => {
  it('debe retornar 404 para ruta inexistente', async () => {
    const res = await request(app)
      .get('/api/ruta-que-no-existe');

    expect(res.status).toBe(404);
  });

  it('debe retornar 401 sin token', async () => {
    const res = await request(app)
      .get('/api/formularios');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_MISSING');
  });

  it('debe retornar 403 para acceso no autorizado', async () => {
    const tokenEmpleado = await login('empleado@test.com', 'test123');

    const res = await request(app)
      .post('/api/formularios')
      .set('x-auth-token', tokenEmpleado)
      .send({
        titulo: 'No debe crear',
        campos: [{ id: 'campo_001', tipo: 'texto_corto', label: 'Test', requerido: true }]
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROLE_REQUIRED');
  });
});

console.log('\n🧪 Tests API v1.0 - FormBuilder SaaS\n');
