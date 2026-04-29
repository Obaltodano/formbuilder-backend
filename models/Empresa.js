// models/Empresa.js - Modelo SaaS para gestión de tenants
const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
  // Información básica
  nombre: {
    type: String,
    required: [true, 'El nombre de la empresa es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  
  slug: {
    type: String,
    required: [true, 'El slug es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones']
  },
  
  logoUrl: {
    type: String,
    default: null
  },
  
  // Estado del tenant
  status: {
    type: String,
    enum: {
      values: ['activo', 'suspendido', 'pendiente_pago', 'demo', 'eliminado'],
      message: 'Estado no válido'
    },
    default: 'demo'
  },
  
  motivoSuspension: {
    type: String,
    default: null
  },
  
  // Configuración de plan y suscripción
  configuracionPlan: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    fechaInicio: {
      type: Date,
      default: Date.now
    },
    fechaVencimiento: {
      type: Date,
      required: true
    },
    limiteUsuarios: {
      type: Number,
      required: true,
      min: 1
    },
    limiteFormularios: {
      type: Number,
      required: true,
      min: 1
    },
    almacenamientoMaxGB: {
      type: Number,
      required: true,
      min: 0.1
    },
    usadoGB: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Personalización de marca
  branding: {
    colorPrimario: {
      type: String,
      default: '#007bff',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal no válido']
    },
    logoLogin: {
      type: String,
      default: null
    },
    favicon: {
      type: String,
      default: null
    }
  },
  
  // Contacto y facturación
  contacto: {
    emailFacturacion: {
      type: String,
      required: true,
      lowercase: true
    },
    telefono: String,
    direccion: String,
    rfc: String, // o identificación fiscal según país
    razonSocial: String
  },
  
  // Metadatos SaaS
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  
  ultimoAcceso: {
    type: Date,
    default: null
  },
  
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // createdAt, updatedAt
});

// Índices para performance (slug ya tiene unique: true en el schema)
EmpresaSchema.index({ status: 1 });
EmpresaSchema.index({ 'configuracionPlan.fechaVencimiento': 1 });
EmpresaSchema.index({ isDeleted: 1 });

// Middleware para soft delete
EmpresaSchema.pre('find', function() {
  this.where({ isDeleted: false });
});

EmpresaSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

// Métodos de instancia
EmpresaSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = 'eliminado';
  return this.save();
};

EmpresaSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.status = 'pendiente_pago';
  return this.save();
};

// Verificar si el plan está activo
EmpresaSchema.methods.isPlanActive = function() {
  return this.status === 'activo' && 
         this.configuracionPlan.fechaVencimiento > new Date();
};

// Calcular días restantes del plan
EmpresaSchema.methods.diasRestantes = function() {
  if (!this.isPlanActive()) return 0;
  const diff = this.configuracionPlan.fechaVencimiento - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Empresa', EmpresaSchema);
