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
            id: Number,
            label: String,        // Ejemplo: "¿Kilometraje del vehículo?"
            tipo: String,         // texto, numero, gps, foto, lista
            requerido: { type: Boolean, default: false },
            opciones: [String]    // Solo para el tipo 'lista'
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