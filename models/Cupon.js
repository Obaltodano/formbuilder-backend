// models/Cupon.js - Modelo para cupones de descuento
const mongoose = require('mongoose');

const CuponSchema = new mongoose.Schema({
  // Código del cupón (único)
  codigo: {
    type: String,
    required: [true, 'El código del cupón es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'El código no puede exceder 20 caracteres']
  },
  
  // Descripción
  descripcion: {
    type: String,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    default: null
  },
  
  // Tipo de descuento
  tipo: {
    type: String,
    enum: {
      values: ['porcentaje', 'fijo'],
      message: 'El tipo de descuento debe ser "porcentaje" o "fijo"'
    },
    required: true
  },
  
  // Valor del descuento
  descuento: {
    type: Number,
    required: [true, 'El valor del descuento es obligatorio'],
    min: [0, 'El descuento no puede ser negativo'],
    validate: {
      validator: function(v) {
        if (this.tipo === 'porcentaje') {
          return v <= 100;
        }
        return true;
      },
      message: 'El descuento porcentual no puede exceder 100%'
    }
  },
  
  // Límites de uso
  usosMaximos: {
    type: Number,
    required: true,
    min: [1, 'Debe permitir al menos 1 uso'],
    default: 100
  },
  
  usosActuales: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Límites por empresa (null = ilimitado)
  usosMaximosPorEmpresa: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Registro de usos por empresa
  usosPorEmpresa: [{
    empresaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa'
    },
    usos: {
      type: Number,
      default: 1
    },
    ultimoUso: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Vigencia
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  
  fechaExpiracion: {
    type: Date,
    required: [true, 'La fecha de expiración es obligatoria']
  },
  
  // Planes aplicables (vacío = todos los planes)
  planesAplicables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  }],
  
  // Monto mínimo de compra para aplicar
  montoMinimo: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Descuento máximo (para porcentajes con tope)
  descuentoMaximo: {
    type: Number,
    default: null
  },
  
  // Estado
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
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

// Índices compuestos (codigo ya tiene unique: true en el schema)
CuponSchema.index({ isActive: 1, fechaExpiracion: 1 });
CuponSchema.index({ fechaInicio: 1, fechaExpiracion: 1 });

// Middleware para actualizar updatedAt
CuponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Métodos de instancia
CuponSchema.methods.isValido = function(empresaId = null, planId = null, monto = 0) {
  // Verificar si está activo
  if (!this.isActive) return { valido: false, razon: 'Cupón inactivo' };
  
  // Verificar fechas
  const ahora = new Date();
  if (ahora < this.fechaInicio) {
    return { valido: false, razon: 'Cupón aún no válido' };
  }
  if (ahora > this.fechaExpiracion) {
    return { valido: false, razon: 'Cupón expirado' };
  }
  
  // Verificar usos totales
  if (this.usosActuales >= this.usosMaximos) {
    return { valido: false, razon: 'Límite de usos alcanzado' };
  }
  
  // Verificar monto mínimo
  if (monto < this.montoMinimo) {
    return { 
      valido: false, 
      razon: `Monto mínimo requerido: $${this.montoMinimo}` 
    };
  }
  
  // Verificar si aplica al plan
  if (this.planesAplicables.length > 0 && planId) {
    const planValido = this.planesAplicables.some(
      id => id.toString() === planId.toString()
    );
    if (!planValido) {
      return { valido: false, razon: 'Cupón no válido para este plan' };
    }
  }
  
  // Verificar usos por empresa
  if (empresaId) {
    const usoEmpresa = this.usosPorEmpresa.find(
      u => u.empresaId.toString() === empresaId.toString()
    );
    if (usoEmpresa && usoEmpresa.usos >= this.usosMaximosPorEmpresa) {
      return { 
        valido: false, 
        razon: `Límite de usos por empresa alcanzado (${this.usosMaximosPorEmpresa})` 
      };
    }
  }
  
  return { valido: true, razon: null };
};

CuponSchema.methods.usar = async function(empresaId) {
  // Incrementar usos totales
  this.usosActuales += 1;
  
  // Incrementar usos por empresa
  const usoIndex = this.usosPorEmpresa.findIndex(
    u => u.empresaId.toString() === empresaId.toString()
  );
  
  if (usoIndex >= 0) {
    this.usosPorEmpresa[usoIndex].usos += 1;
    this.usosPorEmpresa[usoIndex].ultimoUso = new Date();
  } else {
    this.usosPorEmpresa.push({
      empresaId,
      usos: 1,
      ultimoUso: new Date()
    });
  }
  
  return await this.save();
};

CuponSchema.methods.calcularDescuento = function(monto) {
  let descuento = 0;
  
  if (this.tipo === 'porcentaje') {
    descuento = monto * (this.descuento / 100);
    if (this.descuentoMaximo && descuento > this.descuentoMaximo) {
      descuento = this.descuentoMaximo;
    }
  } else {
    descuento = this.descuento;
  }
  
  // El descuento no puede exceder el monto
  return Math.min(descuento, monto);
};

// Métodos estáticos
CuponSchema.statics.validarCodigo = async function(codigo, empresaId, planId, monto) {
  const cupon = await this.findOne({ 
    codigo: codigo.toUpperCase(),
    isActive: true 
  });
  
  if (!cupon) {
    return { valido: false, razon: 'Cupón no encontrado', cupon: null };
  }
  
  const validacion = cupon.isValido(empresaId, planId, monto);
  
  return {
    ...validacion,
    cupon: validacion.valido ? cupon : null,
    descuentoCalculado: validacion.valido ? cupon.calcularDescuento(monto) : 0
  };
};

module.exports = mongoose.model('Cupon', CuponSchema);
