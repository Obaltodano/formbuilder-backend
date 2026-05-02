/**
 * SEED DATABASE - FormBuilder SaaS v1.0
 * Recrea la base de datos con datos de prueba completos
 * 
 * Uso: node seed-database.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Modelos
const User = require('./models/User');
const Empresa = require('./models/Empresa');
const Plan = require('./models/Plan');
const Formulario = require('./models/Formulario');
const Respuesta = require('./models/Respuesta');
const Grupo = require('./models/Grupo');
const Pago = require('./models/Pago');

// Colores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
  passwordHash: bcrypt.hashSync('admin123', 10),
  empresas: [
    { id: 'demo-empresa', nombre: 'Demo Empresa' },
    { id: 'constructora-xyz', nombre: 'Constructora XYZ' },
    { id: 'manufactura-abc', nombre: 'Manufactura ABC' }
  ]
};

// ==================== DATOS DE SEMILLA ====================

const planesSeed = [
  {
    nombre: 'Gratis',
    slug: 'gratis',
    descripcion: 'Plan gratuito para empezar',
    precioMensual: 0,
    precioAnual: 0,
    caracteristicas: {
      maxUsuarios: 3,
      maxFormularios: 5,
      maxGrupos: 1,
      maxRespuestas: 100,
      almacenamientoGB: 0.5,
      multimedia: true,
      gps: true,
      exportExcel: false,
      exportPDF: false,
      branding: false,
      soportePrioritario: false,
      webhooks: false,
      apiAccess: false
    },
    isPublic: true
  },
  {
    nombre: 'Básico',
    slug: 'basico',
    descripcion: 'Ideal para pequeños equipos',
    precioMensual: 29,
    precioAnual: 290,
    caracteristicas: {
      maxUsuarios: 10,
      maxFormularios: 20,
      maxGrupos: 3,
      maxRespuestas: 1000,
      almacenamientoGB: 2,
      multimedia: true,
      gps: true,
      exportExcel: true,
      exportPDF: false,
      branding: false,
      soportePrioritario: false,
      webhooks: false,
      apiAccess: false
    },
    isPublic: true
  },
  {
    nombre: 'Profesional',
    slug: 'profesional',
    descripcion: 'Para empresas en crecimiento',
    precioMensual: 99,
    precioAnual: 990,
    caracteristicas: {
      maxUsuarios: 25,
      maxFormularios: 50,
      maxGrupos: 5,
      maxRespuestas: 10000,
      almacenamientoGB: 10,
      multimedia: true,
      gps: true,
      exportExcel: true,
      exportPDF: true,
      branding: true,
      soportePrioritario: true,
      webhooks: true,
      apiAccess: true
    },
    isPublic: true
  },
  {
    nombre: 'Empresarial',
    slug: 'empresarial',
    descripcion: 'Solución completa para grandes empresas',
    precioMensual: 299,
    precioAnual: 2990,
    caracteristicas: {
      maxUsuarios: 100,
      maxFormularios: 200,
      maxGrupos: 10,
      maxRespuestas: 100000,
      almacenamientoGB: 100,
      multimedia: true,
      gps: true,
      exportExcel: true,
      exportPDF: true,
      branding: true,
      soportePrioritario: true,
      webhooks: true,
      apiAccess: true
    },
    isPublic: true
  }
];

// ==================== FUNCIONES AUXILIARES ====================

async function limpiarBaseDatos() {
  log('\n🧹 Limpiando base de datos...', 'yellow');
  
  await Promise.all([
    User.deleteMany({}),
    Empresa.deleteMany({}),
    Plan.deleteMany({}),
    Formulario.deleteMany({}),
    Respuesta.deleteMany({}),
    Grupo.deleteMany({}),
    Pago.deleteMany({})
  ]);
  
  // Eliminar índices problemáticos
  try {
    await Empresa.collection.dropIndexes();
    log('✅ Índices de Empresa reseteados', 'green');
  } catch (e) {
    // Ignorar si no hay índices
  }
  
  log('✅ Base de datos limpia', 'green');
}

async function crearPlanes() {
  log('\n📦 Creando planes de suscripción...', 'cyan');
  
  // Agregar timestamps manualmente
  const planesConTimestamps = planesSeed.map(p => ({
    ...p,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  const planesCreados = await Plan.insertMany(planesConTimestamps);
  
  planesCreados.forEach(plan => {
    log(`  ✓ ${plan.nombre} - $${plan.precioMensual}/mes`, 'green');
  });
  
  return planesCreados;
}

async function crearSuperAdmin() {
  log('\n👤 Creando SuperAdmin...', 'cyan');
  
  // Usar insertMany para evitar middleware pre-save
  const superAdminData = [{
    nombre: 'Super Administrador',
    email: 'super@sistema.com',
    password: CONFIG.passwordHash, // Ya hasheado
    rol: 'superadmin',
    empresaId: 'SISTEMA_GLOBAL',
    activo: true,
    fotoUrl: null,
    perfil: {
      dni: '00000000',
      telefono: '+51 999 000 000',
      departamento: 'Sistemas',
      cargo: 'Administrador'
    },
    configuracion: {
      notificacionesEmail: true,
      tema: 'dark'
    },
    ultimoAcceso: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }];
  
  const [superAdmin] = await User.insertMany(superAdminData);
  
  log(`  ✓ SuperAdmin: ${superAdmin.email}`, 'green');
  return superAdmin;
}

async function crearEmpresaConUsuarios(plan, empresaConfig) {
  log(`\n🏢 Creando empresa: ${empresaConfig.nombre}...`, 'cyan');
  
  // Crear empresa - asegurar tipos de datos correctos
  const empresaData = {
    empresaId: String(empresaConfig.id),
    nombre: String(empresaConfig.nombre),
    email: `admin@${empresaConfig.id}.com`,
    password: String(CONFIG.passwordHash),
    status: 'activa',
    plan: {
      id: String(plan._id),
      nombre: String(plan.nombre),
      precio: Number(plan.precioMensual) || 0,
      limites: {
        usuarios: parseInt(plan.caracteristicas.maxUsuarios) || 5,
        formularios: parseInt(plan.caracteristicas.maxFormularios) || 10,
        storage: parseInt(plan.caracteristicas.almacenamientoGB * 1024) || 1024, // MB
        respuestas: parseInt(plan.caracteristicas.maxRespuestas) || 1000
      }
    },
    usados: {
      usuarios: 0,
      formularios: 0,
      storage: 0,
      respuestas: 0
    },
    branding: {
      nombreApp: String(empresaConfig.nombre),
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
      emailFacturacion: `facturacion@${empresaConfig.id}.com`,
      telefono: '+51 999 888 777',
      direccion: 'Av. Principal 123, Lima',
      rfc: 'XYZ123456ABC',
      razonSocial: empresaConfig.nombre + ' S.A.C.'
    },
    ultimoAcceso: null
  };
  
  // Crear empresa con insertMany
  const [empresa] = await Empresa.insertMany([empresaData]);
  log(`  ✓ Empresa creada: ${empresa.empresaId}`, 'green');
  
  // Preparar usuarios para insertMany
  const baseUserData = {
    password: CONFIG.passwordHash,
    rol: 'empleado',
    empresaId: empresa.empresaId,
    activo: true,
    fotoUrl: null,
    configuracion: { notificacionesEmail: true, tema: 'dark' },
    ultimoAcceso: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Gerente
  const gerenteData = {
    ...baseUserData,
    nombre: `Gerente ${empresaConfig.nombre}`,
    email: `gerente@${empresaConfig.id}.com`,
    rol: 'gerente',
    perfil: { dni: '12345678', telefono: '+51 999 111 111', departamento: 'Operaciones', cargo: 'Gerente General' }
  };
  
  // Empleados
  const empleadosData = [
    { nombre: 'Juan Pérez', email: `juan@${empresaConfig.id}.com`, cargo: 'Supervisor' },
    { nombre: 'María García', email: `maria@${empresaConfig.id}.com`, cargo: 'Inspector' },
    { nombre: 'Carlos López', email: `carlos@${empresaConfig.id}.com`, cargo: 'Operario' },
    { nombre: 'Ana Martínez', email: `ana@${empresaConfig.id}.com`, cargo: 'Coordinadora' }
  ].slice(0, plan.caracteristicas.maxUsuarios - 1).map(emp => ({
    ...baseUserData,
    nombre: emp.nombre,
    email: emp.email,
    perfil: { dni: '87654321', telefono: '+51 999 222 333', departamento: 'Operaciones', cargo: emp.cargo }
  }));
  
  // Crear todos los usuarios con insertMany
  const todosLosUsuarios = [gerenteData, ...empleadosData];
  const usuariosCreados = await User.insertMany(todosLosUsuarios);
  const [gerente, ...empleados] = usuariosCreados;
  
  log(`  ✓ Gerente: ${gerente.email}`, 'green');
  empleados.forEach(emp => log(`  ✓ Empleado: ${emp.email}`, 'green'));
  
  // Actualizar contador de usuarios
  await Empresa.updateOne(
    { _id: empresa._id },
    { $set: { 'usados.usuarios': usuariosCreados.length } }
  );
  
  return { empresa, gerente, empleados };
}

async function crearFormularios(empresa, gerente) {
  log(`\n📋 Creando formularios para ${empresa.nombre}...`, 'cyan');
  
  const formulariosData = [
    {
      titulo: 'Reporte de Inspección Diaria',
      descripcion: 'Formulario para reportar el estado diario de operaciones',
      campos: [
        { id: 'campo_001', tipo: 'texto_corto', label: 'Nombre del inspector', requerido: true, placeholder: 'Ej: Juan Pérez' },
        { id: 'campo_002', tipo: 'dropdown', label: 'Turno', requerido: true, opciones: ['Mañana', 'Tarde', 'Noche'] },
        { id: 'campo_003', tipo: 'gps', label: 'Ubicación de inspección', requerido: true },
        { id: 'campo_004', tipo: 'foto', label: 'Foto del área', requerido: true },
        { id: 'campo_005', tipo: 'cuadricula_unica', label: 'Estado de equipos', requerido: true, filas: ['Compresor', 'Generador', 'Andamios'], columnas: ['Operativo', 'Dañado', 'En mantenimiento'] },
        { id: 'campo_006', tipo: 'texto_largo', label: 'Observaciones', requerido: false, maxLength: 500 },
        { id: 'campo_007', tipo: 'escala', label: 'Nivel de seguridad', requerido: true, escalaConfig: { min: 1, max: 5, etiquetaMin: 'Inseguro', etiquetaMax: 'Muy seguro' } }
      ]
    },
    {
      titulo: 'Checklist de Seguridad Industrial',
      descripcion: 'Verificación de cumplimiento de normas de seguridad',
      campos: [
        { id: 'campo_001', tipo: 'texto_corto', label: 'Área evaluada', requerido: true },
        { id: 'campo_002', tipo: 'multiple', label: 'EPI disponibles', requerido: true, opciones: ['Casco', 'Guantes', 'Gafas', 'Botas', 'Arnés'] },
        { id: 'campo_003', tipo: 'radio', label: 'Señalización visible', requerido: true, opciones: ['Sí, completa', 'Parcial', 'No visible'] },
        { id: 'campo_004', tipo: 'foto', label: 'Evidencia de área', requerido: true },
        { id: 'campo_005', tipo: 'foto', label: 'Evidencia de señalización', requerido: false },
        { id: 'campo_006', tipo: 'video', label: 'Video de recorrido', requerido: false },
        { id: 'campo_007', tipo: 'adjunto', label: 'Documento de respaldo', requerido: false, tiposPermitidos: ['pdf', 'doc', 'xls'] }
      ]
    },
    {
      titulo: 'Control de Calidad - Producto Terminado',
      descripcion: 'Verificación de calidad antes de despacho',
      campos: [
        { id: 'campo_001', tipo: 'texto_corto', label: 'Código de lote', requerido: true },
        { id: 'campo_002', tipo: 'numero', label: 'Cantidad revisada', requerido: true, min: 1 },
        { id: 'campo_003', tipo: 'cuadricula_multiple', label: 'Defectos encontrados', requerido: false, filas: ['Dimensión', 'Color', 'Acabado'], columnas: ['Ninguno', 'Leve', 'Moderado', 'Severo'] },
        { id: 'campo_004', tipo: 'escala', label: 'Calificación general', requerido: true, escalaConfig: { min: 1, max: 10, etiquetaMin: 'Deficiente', etiquetaMax: 'Excelente' } },
        { id: 'campo_005', tipo: 'foto', label: 'Foto del producto', requerido: true },
        { id: 'campo_006', tipo: 'texto_largo', label: 'Comentarios del inspector', requerido: false }
      ]
    },
    {
      titulo: 'Encuesta de Satisfacción del Cliente',
      descripcion: 'Medir satisfacción de clientes externos',
      campos: [
        { id: 'campo_001', tipo: 'texto_corto', label: 'Nombre del cliente', requerido: true },
        { id: 'campo_002', tipo: 'email', label: 'Email de contacto', requerido: true },
        { id: 'campo_003', tipo: 'escala', label: 'Satisfacción general', requerido: true, escalaConfig: { min: 1, max: 5, etiquetaMin: 'Muy insatisfecho', etiquetaMax: 'Muy satisfecho' } },
        { id: 'campo_004', tipo: 'escala', label: 'Calidad del servicio', requerido: true, escalaConfig: { min: 1, max: 5, etiquetaMin: 'Mala', etiquetaMax: 'Excelente' } },
        { id: 'campo_005', tipo: 'escala', label: 'Tiempo de respuesta', requerido: true, escalaConfig: { min: 1, max: 5, etiquetaMin: 'Lento', etiquetaMax: 'Rápido' } },
        { id: 'campo_006', tipo: 'multiple', label: 'Aspectos a mejorar', requerido: false, opciones: ['Atención', 'Precios', 'Calidad', 'Tiempo de entrega', 'Comunicación'] },
        { id: 'campo_007', tipo: 'texto_largo', label: 'Comentarios adicionales', requerido: false }
      ]
    }
  ];
  
  // Preparar formularios con datos adicionales
  const formulariosConMetadata = formulariosData.map(f => ({
    ...f,
    empresaId: empresa.empresaId,
    creadoPor: gerente._id,
    activo: true,
    esPlantilla: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  // Crear todos los formularios con insertMany
  const formulariosCreados = await Formulario.insertMany(formulariosConMetadata);
  formulariosCreados.forEach(f => log(`  ✓ Formulario: ${f.titulo}`, 'green'));
  
  return formulariosCreados;
}

async function crearRespuestas(formularios, empleados, empresa) {
  log(`\n📤 Creando respuestas de ejemplo...`, 'cyan');
  
  // Verificar que haya empleados disponibles
  if (!empleados || empleados.length === 0) {
    log(`  ⚠️ No hay empleados disponibles para crear respuestas`, 'yellow');
    return [];
  }
  
  const respuestasData = [];
  
  // Crear 3-5 respuestas por formulario
  for (const formulario of formularios) {
    const numRespuestas = Math.floor(Math.random() * 3) + 3; // 3-5 respuestas
    
    for (let i = 0; i < numRespuestas; i++) {
      const empleado = empleados[Math.floor(Math.random() * empleados.length)];
      const datos = {};
      
      // Generar datos según tipo de campo
      for (const campo of formulario.campos) {
        switch (campo.tipo) {
          case 'texto_corto':
            datos[campo.id] = `Valor de ejemplo ${i + 1}`;
            break;
          case 'texto_largo':
            datos[campo.id] = `Esta es una observación de ejemplo para el campo ${campo.label}. Registro #${i + 1}`;
            break;
          case 'numero':
            datos[campo.id] = Math.floor(Math.random() * 100) + 1;
            break;
          case 'email':
            datos[campo.id] = `cliente${i}@ejemplo.com`;
            break;
          case 'dropdown':
            datos[campo.id] = campo.opciones[Math.floor(Math.random() * campo.opciones.length)];
            break;
          case 'radio':
            datos[campo.id] = campo.opciones[Math.floor(Math.random() * campo.opciones.length)];
            break;
          case 'multiple':
            const seleccionados = campo.opciones.filter(() => Math.random() > 0.5);
            datos[campo.id] = seleccionados.length > 0 ? seleccionados : [campo.opciones[0]];
            break;
          case 'escala':
            datos[campo.id] = Math.floor(Math.random() * (campo.escalaConfig.max - campo.escalaConfig.min + 1)) + campo.escalaConfig.min;
            break;
          case 'gps':
            datos[campo.id] = `${(-12.0 + Math.random()).toFixed(4)}, ${(-77.0 + Math.random()).toFixed(4)}`;
            break;
          case 'cuadricula_unica':
            const filasUnica = {};
            for (const fila of campo.filas) {
              filasUnica[fila] = campo.columnas[Math.floor(Math.random() * campo.columnas.length)];
            }
            datos[campo.id] = filasUnica;
            break;
          case 'cuadricula_multiple':
            const filasMultiple = {};
            for (const fila of campo.filas) {
              const cols = campo.columnas.filter(() => Math.random() > 0.7);
              filasMultiple[fila] = cols.length > 0 ? cols : [campo.columnas[0]];
            }
            datos[campo.id] = filasMultiple;
            break;
          default:
            datos[campo.id] = 'valor_default';
        }
      }
      
      // Agregar respuesta al array
      respuestasData.push({
        formularioId: formulario._id,
        empresaId: empresa.empresaId,
        usuarioId: empleado._id,
        datos: datos,
        archivos: [],
        fechaEnvio: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
      });
    }
    
    log(`  ✓ ${numRespuestas} respuestas para: ${formulario.titulo}`, 'green');
  }
  
  // Insertar todas las respuestas de una vez
  if (respuestasData.length > 0) {
    await Respuesta.insertMany(respuestasData);
  }
  
  return respuestasData;
}

async function crearGrupos(empresa, empleados, formularios, gerente) {
  log(`\n👥 Creando grupos de trabajo...`, 'cyan');
  
  const gruposData = [
    {
      nombre: 'Equipo de Seguridad',
      descripcion: 'Personal encargado de inspecciones de seguridad',
      color: '#EF4444',
      usuarios: empleados.slice(0, 2)
    },
    {
      nombre: 'Control de Calidad',
      descripcion: 'Inspectores de calidad y auditoría',
      color: '#10B981',
      usuarios: empleados.slice(1, 3)
    }
  ];
  
  // Preparar grupos con metadata
  const gruposConMetadata = gruposData.map(g => ({
    nombre: g.nombre,
    descripcion: g.descripcion,
    empresaId: empresa.empresaId,
    color: g.color,
    icono: 'users',
    usuarios: g.usuarios.map(u => ({
      usuarioId: u._id,
      rolEnGrupo: 'miembro',
      agregadoPor: gerente._id,
      fechaAgregado: new Date()
    })),
    formulariosAsignados: [{
      formularioId: formularios[0]._id,
      asignadoPor: gerente._id,
      fechaAsignacion: new Date()
    }],
    creadoPor: gerente._id,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  // Crear todos los grupos con insertMany
  const gruposCreados = await Grupo.insertMany(gruposConMetadata);
  gruposCreados.forEach(g => log(`  ✓ Grupo: ${g.nombre} (${g.usuarios.length} miembros)`, 'green'));
  
  return gruposCreados;
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function seedDatabase() {
  try {
    log('\n' + '='.repeat(60), 'magenta');
    log('  🌱 SEED DATABASE - FormBuilder SaaS v1.0', 'bright');
    log('='.repeat(60), 'magenta');
    
    // 1. Conectar a MongoDB
    log('\n📡 Conectando a MongoDB...', 'cyan');
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder';
    await mongoose.connect(mongoURI);
    log('✅ Conexión exitosa', 'green');
    
    // 2. Limpiar base de datos
    await limpiarBaseDatos();
    
    // 3. Crear planes
    const planes = await crearPlanes();
    
    // 4. Crear SuperAdmin
    await crearSuperAdmin();
    
    // 5. Crear empresas con usuarios y todo
    const resultados = [];
    
    for (const empresaConfig of CONFIG.empresas) {
      // Asignar un plan a cada empresa (ciclando)
      const plan = planes[CONFIG.empresas.indexOf(empresaConfig) % planes.length];
      
      const { empresa, gerente, empleados } = await crearEmpresaConUsuarios(plan, empresaConfig);
      const formularios = await crearFormularios(empresa, gerente);
      const respuestas = await crearRespuestas(formularios, empleados, empresa);
      const grupos = await crearGrupos(empresa, empleados, formularios, gerente);
      
      // Actualizar contadores de empresa
      empresa.usados.formularios = formularios.length;
      empresa.usados.respuestas = respuestas.length;
      await empresa.save();
      
      resultados.push({
        empresa: empresa.nombre,
        usuarios: 1 + empleados.length,
        formularios: formularios.length,
        respuestas: respuestas.length,
        grupos: grupos.length
      });
    }
    
    // 6. Resumen final
    log('\n' + '='.repeat(60), 'magenta');
    log('  📊 RESUMEN DE BASE DE DATOS', 'bright');
    log('='.repeat(60), 'magenta');
    
    for (const resultado of resultados) {
      log(`\n🏢 ${resultado.empresa}`, 'yellow');
      log(`   Usuarios: ${resultado.usuarios}`, 'reset');
      log(`   Formularios: ${resultado.formularios}`, 'reset');
      log(`   Respuestas: ${resultado.respuestas}`, 'reset');
      log(`   Grupos: ${resultado.grupos}`, 'reset');
    }
    
    log('\n' + '='.repeat(60), 'magenta');
    log('  ✅ BASE DE DATOS SEMBRADA EXITOSAMENTE', 'bright');
    log('='.repeat(60), 'magenta');
    
    log('\n🔑 Credenciales de acceso:', 'cyan');
    log('   SuperAdmin: super@sistema.com / admin123', 'green');
    for (const empresaConfig of CONFIG.empresas) {
      log(`   Gerente ${empresaConfig.nombre}: gerente@${empresaConfig.id}.com / admin123`, 'green');
      log(`   Empleados: juan|maria|carlos|ana@${empresaConfig.id}.com / admin123`, 'reset');
    }
    
    log('\n📚 Endpoints disponibles:', 'cyan');
    log('   POST /api/auth/login', 'reset');
    log('   GET  /api/formularios', 'reset');
    log('   POST /api/respuestas', 'reset');
    log('   GET  /api/usuarios/equipo', 'reset');
    
    log('');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('\n👋 Conexión cerrada\n', 'cyan');
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
