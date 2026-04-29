// models/Pago.js - Modelo para control de pagos y caja
const mongoose = require('mongoose');

const PagoSchema = new mongoose.Schema({
  // Referencia a la empresa
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'La empresa es obligatoria'],
    index: true
  },
  
  // Referencia al plan pagado
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  
  // Información del pago
  monto: {
    type: Number,
    required: [true, 'El monto es obligatorio'],
    min: [0, 'El monto no puede ser negativo']
  },
  
  // Moneda (para futura expansión internacional)
  moneda: {
    type: String,
    default: 'MXN',
    enum: ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN']
  },
  
  // Tipo de pago
  tipoPago: {
    type: String,
    enum: ['nueva_suscripcion', 'renovacion', 'upgrade', 'downgrade', 'extra_usuarios', 'extra_almacenamiento'],
    default: 'renovacion'
  },
  
  // Período contratado
  periodo: {
    tipo: {
      type: String,
      enum: ['mensual', 'anual'],
      required: true
    },
    meses: {
      type: Number,
      default: function() {
        return this.periodo.tipo === 'anual' ? 12 : 1;
      }
    }
  },
  
  // Cupón aplicado (opcional)
  cuponAplicado: {
    codigo: String,
    descuento: Number,
    tipo: {
      type: String,
      enum: ['porcentaje', 'fijo']
    }
  },
  
  // Estado del pago
  status: {
    type: String,
    enum: {
      values: ['pendiente', 'en_revision', 'aprobado', 'rechazado', 'reembolsado'],
      message: 'Estado de pago no válido'
    },
    default: 'pendiente'
  },
  
  // Comprobante de pago (captura de transferencia)
  comprobanteUrl: {
    type: String,
    required: function() {
      return this.metodoPago === 'transferencia';
    }
  },
  
  // Método de pago
  metodoPago: {
    type: String,
    enum: ['transferencia', 'deposito', 'efectivo', 'tarjeta', 'otro'],
    default: 'transferencia'
  },
  
  // Referencia bancaria (número de operación, etc.)
  referenciaBancaria: {
    type: String,
    default: null
  },
  
  // Fechas importantes
  fechaPeticion: {
    type: Date,
    default: Date.now
  },
  
  fechaRevision: {
    type: Date,
    default: null
  },
  
  fechaAprobacion: {
    type: Date,
    default: null
  },
  
  // Fechas de vigencia que se aplicarán al aprobar
  vigencia: {
    fechaInicio: {
      type: Date,
      default: null
    },
    fechaFin: {
      type: Date,
      default: null
    }
  },
  
  // Admin que revisó/aprobó
  revisadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notas del administrador
  notasAdmin: {
    type: String,
    maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres'],
    default: null
  },
  
  // Notas del solicitante
  notasSolicitante: {
    type: String,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres'],
    default: null
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
}, {
  timestamps: true
});

// Índices para queries frecuentes
PagoSchema.index({ empresaId: 1, status: 1 });
PagoSchema.index({ status: 1, fechaPeticion: -1 });
PagoSchema.index({ fechaAprobacion: -1 });
PagoSchema.index({ 'vigencia.fechaFin': 1 });

// Middleware para actualizar fechas de revisión/aprobación
PagoSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'en_revision' && !this.fechaRevision) {
      this.fechaRevision = new Date();
    }
    if (this.status === 'aprobado' && !this.fechaAprobacion) {
      this.fechaAprobacion = new Date();
    }
  }
  next();
});

// Métodos de instancia
PagoSchema.methods.aprobar = function(adminId, notas = '') {
  this.status = 'aprobado';
  this.revisadoPor = adminId;
  this.fechaAprobacion = new Date();
  if (notas) this.notasAdmin = notas;
  return this.save();
};

PagoSchema.methods.rechazar = function(adminId, razon) {
  this.status = 'rechazado';
  this.revisadoPor = adminId;
  this.fechaRevision = new Date();
  this.notasAdmin = razon;
  return this.save();
};

PagoSchema.methods.ponerEnRevision = function(adminId) {
  this.status = 'en_revision';
  this.revisadoPor = adminId;
  this.fechaRevision = new Date();
  return this.save();
};

// Métodos estáticos
PagoSchema.statics.getPagosPendientes = function() {
  return this.find({ status: 'pendiente' })
    .populate('empresaId', 'nombre emailFacturacion')
    .populate('planId', 'nombre')
    .sort({ fechaPeticion: -1 });
};

PagoSchema.statics.getPagosPorEmpresa = function(empresaId) {
  return this.find({ empresaId })
    .populate('planId', 'nombre')
    .sort({ fechaPeticion: -1 });
};

PagoSchema.statics.getMRR = async function() {
  // Monthly Recurring Revenue
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  
  const resultado = await this.aggregate([
    {
      $match: {
        status: 'aprobado',
        fechaAprobacion: { $gte: inicioMes }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$monto' }
      }
    }
  ]);
  
  return resultado[0]?.total || 0;
};

module.exports = mongoose.model('Pago', PagoSchema);
