// models/Plan.js - Modelo para planes de suscripción SaaS
const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  // Información básica
  nombre: {
    type: String,
    required: [true, 'El nombre del plan es obligatorio'],
    trim: true,
    unique: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  descripcion: {
    type: String,
    required: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  
  // Precios
  precioMensual: {
    type: Number,
    required: true,
    min: [0, 'El precio no puede ser negativo'],
    default: 0
  },
  
  precioAnual: {
    type: Number,
    required: true,
    min: [0, 'El precio no puede ser negativo'],
    default: 0
  },
  
  // Descuento por anualidad (calculado automáticamente)
  descuentoAnual: {
    type: Number,
    default: function() {
      if (this.precioMensual === 0) return 0;
      const ahorro = (this.precioMensual * 12) - this.precioAnual;
      return Math.round((ahorro / (this.precioMensual * 12)) * 100);
    }
  },
  
  // Características del plan
  caracteristicas: {
    maxUsuarios: {
      type: Number,
      required: true,
      min: 1,
      default: 5
    },
    maxFormularios: {
      type: Number,
      required: true,
      min: 1,
      default: 10
    },
    maxGrupos: {
      type: Number,
      default: 3
    },
    maxRespuestasPorFormulario: {
      type: Number,
      default: 1000
    },
    multimedia: {
      type: Boolean,
      default: true
    },
    gps: {
      type: Boolean,
      default: true
    },
    exportExcel: {
      type: Boolean,
      default: false
    },
    exportPDF: {
      type: Boolean,
      default: false
    },
    brandingPersonalizado: {
      type: Boolean,
      default: false
    },
    soportePrioritario: {
      type: Boolean,
      default: false
    },
    webhooks: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    almacenamientoGB: {
      type: Number,
      required: true,
      min: 0.5,
      default: 5
    }
  },
  
  // Visibilidad
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Destacar en marketplace
  isDestacado: {
    type: Boolean,
    default: false
  },
  
  // Orden de visualización
  orden: {
    type: Number,
    default: 0
  },
  
  // Estado
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
PlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Recalcular descuento anual si cambian los precios
  if (this.isModified('precioMensual') || this.isModified('precioAnual')) {
    if (this.precioMensual > 0) {
      const ahorro = (this.precioMensual * 12) - this.precioAnual;
      this.descuentoAnual = Math.round((ahorro / (this.precioMensual * 12)) * 100);
    }
  }
  
  next();
});

// Índices compuestos (slug ya tiene unique: true en el schema)
PlanSchema.index({ isPublic: 1, isActive: 1, orden: 1 });
PlanSchema.index({ precioMensual: 1 });

// Métodos estáticos
PlanSchema.statics.getPublicPlans = function() {
  return this.find({ 
    isPublic: true, 
    isActive: true 
  }).sort({ orden: 1, precioMensual: 1 });
};

PlanSchema.statics.getPlanBySlug = function(slug) {
  return this.findOne({ 
    slug, 
    isActive: true 
  });
};

// Método para aplicar cupón
PlanSchema.methods.calcularPrecioConDescuento = function(cupon, esAnual = false) {
  const precioBase = esAnual ? this.precioAnual : this.precioMensual;
  
  if (!cupon || !cupon.isValido()) {
    return {
      precioOriginal: precioBase,
      descuentoAplicado: 0,
      precioFinal: precioBase,
      tipoDescuento: null
    };
  }
  
  let descuento = 0;
  
  if (cupon.tipo === 'porcentaje') {
    descuento = precioBase * (cupon.descuento / 100);
  } else if (cupon.tipo === 'fijo') {
    descuento = cupon.descuento;
  }
  
  const precioFinal = Math.max(0, precioBase - descuento);
  
  return {
    precioOriginal: precioBase,
    descuentoAplicado: descuento,
    precioFinal,
    tipoDescuento: cupon.tipo,
    codigoCupon: cupon.codigo
  };
};

module.exports = mongoose.model('Plan', PlanSchema);
