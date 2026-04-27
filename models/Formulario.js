const mongoose = require('mongoose');

const FormularioSchema = new mongoose.Schema({
    titulo: { 
        type: String, 
        required: true 
    },
    descripcion: { 
        type: String 
    },
    categoria: { type: String },
    empresaId: { 
        type: String, 
        required: true, 
        index: true // Esto acelera las búsquedas por empresa
    },
    campos: [
        {
            label: String,
            tipo: String, // "cuadricula_unica" o "cuadricula_multiple"
            requerido: Boolean,
            // Agrega estos dos para las cuadrículas:
            filas: [String],    // Ejemplo: ["Limpieza", "Atención"]
            columnas: [String], // Ejemplo: ["Malo", "Regular", "Bueno"]
            opciones: Array      // Puedes mantenerlo para otros tipos de campo
        }
    ],
    esPlantilla: { type: Boolean, default: false },
    creadoPor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    fechaCreacion: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Formulario', FormularioSchema);