// models/Empresa.js - Modelo SaaS para gestión de tenants (Contrato v1.0)
const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
  // Información básica
  nombre: {
    type: String,
    required: [true, 'El nombre de la empresa es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  
  empresaId: {
    type: String,
    required: [true, 'El empresaId es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'El empresaId solo puede contener letras minúsculas, números y guiones'],
    alias: 'slug'
  },
  
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  
  password: {
    type: String,
    required: true
  },
  
  // Estado del tenant (Según contrato v1.0)
  status: {
    type: String,
    enum: {
      values: ['activa', 'suspendida', 'demo', 'pendiente'],
      message: 'Estado no válido'
    },
    default: 'pendiente'
  },
  
  motivoSuspension: {
    type: String,
    default: null
  },
  
  // Plan y suscripción
  plan: {
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    limites: {
      usuarios: { type: Number, default: 5 },
      formularios: { type: Number, default: 10 },
      storage: { type: Number, default: 100 }, // en MB
      respuestas: { type: Number, default: 1000 }
    }
  },
  
  // Contadores de uso (Según contrato v1.0)
  usados: {
    usuarios: { type: Number, default: 0 },
    formularios: { type: Number, default: 0 },
    storage: { type: Number, default: 0 }, // en MB
    respuestas: { type: Number, default: 0 }
  },
  
  // Personalización de marca (Según contrato v1.0)
  branding: {
    nombreApp: {
      type: String,
      default: 'Form Builder'
    },
    logoUrl: {
      type: String,
      default: null
    },
    colorPrimario: {
      type: String,
      default: '#3B82F6',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal no válido']
    },
    colorSecundario: {
      type: String,
      default: '#1E293B',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hexadecimal no válido']
    },
    favicon: {
      type: String,
      default: null
    }
  },
  
  // Configuración adicional
  configuracion: {
    dominioPersonalizado: String,
    notificaciones: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    }
  },
  
  // Contacto y facturación
  contacto: {
    emailFacturacion: {
      type: String,
      lowercase: true
    },
    telefono: String,
    direccion: String,
    rfc: String,
    razonSocial: String
  },
  
  // Metadatos
  ultimoAcceso: {
    type: Date,
    default: null
  },
  
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true // createdAt, updatedAt
});

// Índices para performance
EmpresaSchema.index({ status: 1 });
// Nota: empresaId ya tiene unique: true que crea índice automáticamente


// Métodos de instancia

// Verificar si la empresa está activa
EmpresaSchema.methods.isActiva = function() {
  return this.status === 'activa';
};

// Incrementar contadores de uso
EmpresaSchema.methods.incrementarContador = async function(campo, cantidad = 1) {
  this.usados[campo] += cantidad;
  return await this.save();
};

// Verificar si ha excedido algún límite
EmpresaSchema.methods.verificarLimites = function() {
  const limites = {
    usuarios: this.usados.usuarios >= this.plan.limites.usuarios,
    formularios: this.usados.formularios >= this.plan.limites.formularios,
    storage: this.usados.storage >= this.plan.limites.storage,
    respuestas: this.usados.respuestas >= this.plan.limites.respuestas
  };
  
  return {
    excedido: Object.values(limites).some(v => v),
    detalles: limites
  };
};

// Métodos estáticos
EmpresaSchema.statics.findByEmpresaId = function(empresaId) {
  return this.findOne({ empresaId });
};

module.exports = mongoose.model('Empresa', EmpresaSchema);
