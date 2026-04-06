const mongoose = require('mongoose');

const RespuestaSchema = new mongoose.Schema({
    formularioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Formulario', 
        required: true 
    },
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    empresaId: { 
        type: String, 
        required: true 
    },
    datos: { 
        type: Object, // Aquí guardamos el JSON con las respuestas { "Kilometraje": "1500", ... }
        required: true 
    },
    fechaEnvio: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Respuesta', RespuestaSchema);