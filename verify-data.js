/**
 * Verificar y corregir consistencia de datos
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Empresa = require('./models/Empresa');

async function verifyAndFix() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado\n');

    // 1. Verificar empresas
    const empresas = await Empresa.find({});
    console.log(`📊 Empresas encontradas: ${empresas.length}`);
    empresas.forEach(e => {
      console.log(`  - ${e.nombre} (ID: ${e._id}, empresaId: ${e.empresaId})`);
    });

    // 2. Verificar usuarios
    const usuarios = await User.find({});
    console.log(`\n👥 Usuarios encontrados: ${usuarios.length}`);
    
    const problemas = [];
    
    for (const u of usuarios) {
      // Verificar si la empresa existe
      const empresaExiste = await Empresa.findOne({ empresaId: u.empresaId });
      
      if (!empresaExiste && u.empresaId !== 'SISTEMA_GLOBAL') {
        console.log(`  ❌ ${u.email} -> empresaId inválido: ${u.empresaId}`);
        problemas.push(u);
      } else {
        console.log(`  ✅ ${u.email} -> ${u.empresaId}`);
      }
    }

    // 3. Corregir problemas si los hay
    if (problemas.length > 0 && empresas.length > 0) {
      console.log(`\n🔧 Corrigiendo ${problemas.length} usuarios...`);
      
      const empresaDefault = empresas[0]; // Usar primera empresa
      
      for (const u of problemas) {
        await User.updateOne(
          { _id: u._id },
          { $set: { empresaId: empresaDefault.empresaId } }
        );
        console.log(`  ✓ ${u.email} -> ahora usa ${empresaDefault.empresaId}`);
      }
    }

    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyAndFix();
