// models/Respuesta.js - Modelo de Respuesta (Contrato v1.0)
const mongoose = require('mongoose');

const ArchivoSchema = new mongoose.Schema({
  campoId: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['foto', 'video', 'adjunto'],
    required: true
  },
  originalName: String,
  mimetype: String,
  size: Number
}, { _id: false });

const RespuestaSchema = new mongoose.Schema({
  formularioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formulario',
    required: true
  },
  
  empresaId: {
    type: String,
    required: true,
    index: true
  },
  
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Datos dinámicos - Objeto flexible con las respuestas
  // Las llaves son los campoId del formulario
  datos: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Metadatos de archivos subidos
  archivos: [ArchivoSchema],
  
  // Fecha de envío
  fechaEnvio: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  minimize: false // Evita que Mongoose elimine objetos vacíos
});

// Índices
RespuestaSchema.index({ formularioId: 1, empresaId: 1 });
RespuestaSchema.index({ usuarioId: 1 });
RespuestaSchema.index({ fechaEnvio: -1 });

// Método para obtener archivos de un campo específico
RespuestaSchema.methods.getArchivosPorCampo = function(campoId) {
  return this.archivos.filter(archivo => archivo.campoId === campoId);
};

// Método para obtener valor de un campo específico
RespuestaSchema.methods.getValorCampo = function(campoId) {
  return this.datos[campoId];
};

module.exports = mongoose.model('Respuesta', RespuestaSchema);