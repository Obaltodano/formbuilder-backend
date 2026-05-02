/**
 * Test de login para diagnóstico
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Empresa = require('./models/Empresa');

async function testLogin() {
  try {
    console.log('🔌 Conectando...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder');
    console.log('✅ Conectado\n');

    const email = 'gerente@demo-empresa.com';
    const password = 'admin123';

    console.log('🔐 Probando login para:', email);

    // 1. Buscar usuario
    const usuario = await User.findOne({ email });
    console.log('\n1. Usuario encontrado:', usuario ? '✅ Sí' : '❌ No');
    
    if (usuario) {
      console.log('   _id:', usuario._id);
      console.log('   email:', usuario.email);
      console.log('   rol:', usuario.rol);
      console.log('   empresaId:', usuario.empresaId);
      console.log('   activo:', usuario.activo);
      console.log('   password (hasheado):', usuario.password ? '✅ Tiene' : '❌ No tiene');

      // 2. Verificar contraseña
      const esValida = await bcrypt.compare(password, usuario.password);
      console.log('\n2. Contraseña válida:', esValida ? '✅ Sí' : '❌ No');

      // 3. Buscar empresa
      console.log('\n3. Buscando empresa con empresaId:', usuario.empresaId);
      const empresa = await Empresa.findByEmpresaId(usuario.empresaId);
      console.log('   Resultado:', empresa ? `✅ ${empresa.nombre}` : '❌ No encontrada');
      
      if (!empresa) {
        // 4. Verificar qué empresas existen
        console.log('\n4. Todas las empresas en la base:');
        const todas = await Empresa.find({}).select('empresaId nombre');
        todas.forEach(e => {
          console.log(`   - empresaId: "${e.empresaId}" | nombre: ${e.nombre}`);
        });
        
        // 5. Verificar si hay match exacto
        const matchExacto = await Empresa.findOne({ empresaId: usuario.empresaId });
        console.log('\n5. Match exacto con findOne:', matchExacto ? '✅ Sí' : '❌ No');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testLogin();
