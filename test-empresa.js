const mongoose = require('mongoose');
require('dotenv').config();
const Empresa = require('./models/Empresa');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder');
  
  try {
    const testEmpresa = {
      empresaId: 'test123',
      nombre: 'Test',
      slug: 'test123',
      email: 'test@test.com',
      password: 'hashedpass',
      status: 'activa',
      plan: {
        id: '123456789012345678901234',
        nombre: 'Test',
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
      ultimoAcceso: null
    };
    
    const emp = await Empresa.create(testEmpresa);
    console.log('✅ Éxito:', emp._id);
  } catch (err) {
    console.log('❌ Error:', err.message);
    if (err.errors) {
      Object.keys(err.errors).forEach(key => {
        const e = err.errors[key];
        console.log(`  - ${key}: ${e.message} (valor: ${JSON.stringify(e.value)}, tipo: ${e.valueType})`);
      });
    }
  }
  
  await mongoose.connection.close();
}

test();
