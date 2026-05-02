// models/Grupo.js - Modelo para grupos de usuarios dentro de empresas
const mongoose = require('mongoose');

const GrupoSchema = new mongoose.Schema({
  // Información básica
  nombre: {
    type: String,
    required: [true, 'El nombre del grupo es obligatorio'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  
  descripcion: {
    type: String,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    default: null
  },
  
  // Referencia a la empresa (string para multi-tenancy)
  empresaId: {
    type: String,
    required: [true, 'La empresa es obligatoria'],
    index: true
  },
  
  // Color para identificación visual
  color: {
    type: String,
    default: '#6c757d',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal no válido']
  },
  
  // Icono (nombre de clase CSS o referencia)
  icono: {
    type: String,
    default: 'users',
    maxlength: [30, 'El nombre del icono no puede exceder 30 caracteres']
  },
  
  // Usuarios miembros del grupo
  usuarios: [{
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rolEnGrupo: {
      type: String,
      enum: ['lider', 'miembro'],
      default: 'miembro'
    },
    fechaUnion: {
      type: Date,
      default: Date.now
    },
    agregadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Formularios asignados al grupo (asignación masiva)
  formulariosAsignados: [{
    formularioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Formulario',
      required: true
    },
    asignadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fechaAsignacion: {
      type: Date,
      default: Date.now
    },
    fechaVencimiento: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['activo', 'pausado', 'completado'],
      default: 'activo'
    }
  }],
  
  // Líder del grupo
  liderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Estado del grupo
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // Metadatos
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices compuestos
GrupoSchema.index({ empresaId: 1, isDeleted: 1 });
GrupoSchema.index({ empresaId: 1, nombre: 1 });
GrupoSchema.index({ 'usuarios.usuarioId': 1 });
GrupoSchema.index({ 'formulariosAsignados.formularioId': 1 });

// Middleware para soft delete
GrupoSchema.pre('find', function() {
  this.where({ isDeleted: false });
});

GrupoSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

// Validación: No permitir duplicados de usuarios en el mismo grupo
GrupoSchema.pre('save', function(next) {
  const usuarioIds = this.usuarios.map(u => u.usuarioId.toString());
  const unicos = [...new Set(usuarioIds)];
  
  if (usuarioIds.length !== unicos.length) {
    return next(new Error('No se pueden agregar usuarios duplicados al grupo'));
  }
  
  // Si hay un liderId, verificar que esté en la lista de usuarios
  if (this.liderId && !usuarioIds.includes(this.liderId.toString())) {
    return next(new Error('El líder debe ser miembro del grupo'));
  }
  
  next();
});

// Métodos de instancia
GrupoSchema.methods.agregarUsuario = function(usuarioId, agregadoPor, rolEnGrupo = 'miembro') {
  const yaExiste = this.usuarios.some(
    u => u.usuarioId.toString() === usuarioId.toString()
  );
  
  if (yaExiste) {
    throw new Error('El usuario ya es miembro del grupo');
  }
  
  this.usuarios.push({
    usuarioId,
    rolEnGrupo,
    agregadoPor,
    fechaUnion: new Date()
  });
  
  return this.save();
};

GrupoSchema.methods.removerUsuario = function(usuarioId) {
  const index = this.usuarios.findIndex(
    u => u.usuarioId.toString() === usuarioId.toString()
  );
  
  if (index === -1) {
    throw new Error('El usuario no es miembro del grupo');
  }
  
  // Verificar que no sea el líder
  if (this.liderId && this.liderId.toString() === usuarioId.toString()) {
    this.liderId = null;
  }
  
  this.usuarios.splice(index, 1);
  return this.save();
};

GrupoSchema.methods.asignarFormulario = function(formularioId, asignadoPor, fechaVencimiento = null) {
  const yaAsignado = this.formulariosAsignados.some(
    f => f.formularioId.toString() === formularioId.toString() && f.status === 'activo'
  );
  
  if (yaAsignado) {
    throw new Error('El formulario ya está asignado a este grupo');
  }
  
  this.formulariosAsignados.push({
    formularioId,
    asignadoPor,
    fechaAsignacion: new Date(),
    fechaVencimiento,
    status: 'activo'
  });
  
  return this.save();
};

GrupoSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Métodos estáticos
GrupoSchema.statics.findByEmpresa = function(empresaId) {
  return this.find({ empresaId, isDeleted: false, isActive: true })
    .populate('usuarios.usuarioId', 'nombre email fotoUrl')
    .populate('liderId', 'nombre email')
    .sort({ fechaCreacion: -1 });
};

GrupoSchema.statics.findByUsuario = function(usuarioId, empresaId) {
  return this.find({
    empresaId,
    'usuarios.usuarioId': usuarioId,
    isDeleted: false,
    isActive: true
  }).populate('creadoPor', 'nombre');
};

module.exports = mongoose.model('Grupo', GrupoSchema);
