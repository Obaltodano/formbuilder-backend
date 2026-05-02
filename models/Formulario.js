// models/Formulario.js - Modelo de Formulario (Contrato v1.0)
const mongoose = require('mongoose');

// Schema para validación de campos según tipo
const CampoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: [
      'texto_corto',
      'texto_largo',
      'numero',
      'email',
      'foto',
      'video',
      'gps',
      'adjunto',
      'radio',
      'multiple',
      'dropdown',
      'escala',
      'cuadricula_unica',
      'cuadricula_multiple'
    ]
  },
  requerido: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  
  // Para opciones: radio, multiple, dropdown
  opciones: [String],
  
  // Para cuadriculas
  filas: [String],
  columnas: [String],
  
  // Configuración de escala
  escalaConfig: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 5 },
    etiquetaMin: String,
    etiquetaMax: String
  },
  
  // Validación numérica/texto
  validacion: {
    min: Number,
    max: Number,
    maxLength: Number
  },
  
  // Para archivos adjuntos: tipos permitidos
  acepta: String // Ej: ".pdf,.doc,.xlsx"
}, { _id: false });

const FormularioSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título del formulario es obligatorio'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  
  // ID de la empresa (tenant)
  empresaId: {
    type: String,
    required: true,
    index: true
  },
  
  // Usuario creador
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Array de campos con estructura definida
  campos: [CampoSchema],
  
  // Estado del formulario
  activo: {
    type: Boolean,
    default: true
  },
  
  // Si es plantilla de marketplace
  esPlantilla: {
    type: Boolean,
    default: false
  },
  
  // Categoría solo si es plantilla
  categoria: {
    type: String,
    enum: ['Seguridad', 'Operaciones', 'Calidad', 'Recursos Humanos', 'Ventas', 'Otro'],
    default: null
  }
}, {
  timestamps: true // createdAt, updatedAt
});

// Índices adicionales
FormularioSchema.index({ empresaId: 1, activo: 1 });
FormularioSchema.index({ esPlantilla: 1, categoria: 1 });

// Método para obtener campos por tipo
FormularioSchema.methods.getCamposPorTipo = function(tipo) {
  return this.campos.filter(campo => campo.tipo === tipo);
};

// Método para validar datos contra campos
FormularioSchema.methods.validarDatos = function(datos) {
  const errores = [];
  
  for (const campo of this.campos) {
    if (campo.requerido && (!datos[campo.id] || datos[campo.id] === '')) {
      errores.push({
        campo: campo.id,
        mensaje: `El campo "${campo.label}" es requerido`
      });
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
};

module.exports = mongoose.model('Formulario', FormularioSchema);