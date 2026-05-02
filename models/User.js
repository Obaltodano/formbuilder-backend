// models/User.js - Modelo de Usuario (Contrato v1.0)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria']
  },
  
  rol: {
    type: String,
    enum: ['superadmin', 'gerente', 'empleado', 'usuario'],
    default: 'empleado'
  },
  
  empresaId: {
    type: String,
    required: true,
    index: true
  },
  
  // Foto de perfil
  fotoUrl: {
    type: String,
    default: null
  },
  
  // Perfil detallado
  perfil: {
    dni: String,
    telefono: String,
    departamento: String,
    cargo: String
  },
  
  // Configuración de usuario
  configuracion: {
    notificacionesEmail: { type: Boolean, default: true },
    tema: { type: String, default: 'dark', enum: ['light', 'dark'] }
  },
  
  // Estado de la cuenta
  activo: {
    type: Boolean,
    default: true
  },
  
  // Último acceso
  ultimoAcceso: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // createdAt, updatedAt
});

// Middleware: Encriptar contraseña antes de guardar
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Índices adicionales
UserSchema.index({ empresaId: 1, activo: 1 });
UserSchema.index({ rol: 1 });

// Métodos de instancia
UserSchema.methods.actualizarUltimoAcceso = function() {
  this.ultimoAcceso = new Date();
  return this.save();
};

// Métodos estáticos
UserSchema.statics.findByEmpresa = function(empresaId) {
  return this.find({ empresaId, activo: true });
};

UserSchema.statics.contarPorEmpresa = function(empresaId) {
  return this.countDocuments({ empresaId, activo: true });
};

module.exports = mongoose.model('User', UserSchema);