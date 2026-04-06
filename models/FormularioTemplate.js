const mongoose = require('mongoose');

const FormTemplateSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  categoria: { type: String, enum: ['Seguridad', 'Inventario', 'Ventas', 'Limpieza'] },
  campos: { type: Array, default: [] }, // La estructura del formulario
  precio: { type: Number, default: 0 }, // 0 si es gratis
  imagenPreview: { type: String }, // Una captura de cómo se ve
  instalaciones: { type: Number, default: 0 }
});

module.exports = mongoose.model('FormTemplate', FormTemplateSchema);