/**
 * SEED SIMPLE - Diagnóstico
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Empresa = require('./models/Empresa');
const User = require('./models/User');
const Plan = require('./models/Plan');

async function seedSimple() {
  try {
    console.log('🌱 Conectando a MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado');

    // Limpiar
    await Empresa.deleteMany({});
    await User.deleteMany({});
    await Plan.deleteMany({});
    console.log('🧹 Datos limpiados');

    // Crear plan simple
    const plan = await Plan.create({
      nombre: 'Test',
      slug: 'test',
      descripcion: 'Plan test',
      precioMensual: 10,
      precioAnual: 100,
      caracteristicas: {
        maxUsuarios: 5,
        maxFormularios: 10,
        maxGrupos: 2,
        maxRespuestas: 100,
        almacenamientoGB: 1
      }
    });
    console.log('✅ Plan creado:', plan._id);

    // Crear empresa con datos mínimos
    const empresaData = {
      empresaId: 'test-empresa',
      nombre: 'Test Empresa',
      slug: 'test-empresa',
      email: 'admin@test.com',
      password: bcrypt.hashSync('test123', 10),
      status: 'activa',
      plan: {
        id: plan._id.toString(),
        nombre: plan.nombre,
        precio: 10,
        limites: {
          usuarios: 5,
          formularios: 10,
          storage: 1024,
          respuestas: 100
        }
      },
      usados: {
        usuarios: 0,
        formularios: 0,
        storage: 0,
        respuestas: 0
      },
      branding: {
        nombreApp: 'Test',
        logoUrl: null,
        colorPrimario: '#3B82F6',
        colorSecundario: '#1E293B',
        favicon: null
      },
      configuracion: {
        dominioPersonalizado: null,
        notificaciones: {
          email: true,
          push: false
        }
      },
      contacto: {
        emailFacturacion: 'fact@test.com',
        telefono: '123',
        direccion: 'test',
        rfc: 'TEST123',
        razonSocial: 'Test S.A.'
      },
      ultimoAcceso: null,
      creadoPor: null
    };

    console.log('📊 Datos de empresa a crear:', JSON.stringify(empresaData, null, 2));
    
    const empresa = await Empresa.create(empresaData);
    console.log('✅ Empresa creada:', empresa._id);

    // Crear usuario
    const user = await User.create({
      nombre: 'Test User',
      email: 'test@test.com',
      password: bcrypt.hashSync('test123', 10),
      rol: 'gerente',
      empresaId: empresa.empresaId,
      activo: true
    });
    console.log('✅ Usuario creado:', user._id);

    console.log('\n🎉 Seed completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Detalles:', error.errors);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}:`, error.errors[key].message, `(tipo: ${error.errors[key].valueType})`);
      });
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seedSimple();
