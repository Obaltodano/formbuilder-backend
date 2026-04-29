const mongoose = require('mongoose');

const RespuestaSchema = new mongoose.Schema({
    formularioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Formulario', 
        required: true 
    },
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Corregido para coincidir con el modelo User
        required: true 
    },
    empresaId: { 
        type: String, 
        required: true 
    },
    datos: { 
        type: mongoose.Schema.Types.Mixed, // Mixed es más robusto para JSON dinámico
        required: true 
    },
    fechaEnvio: { 
        type: Date, 
        default: Date.now 
    }
}, { minimize: false }); // Evita que Mongoose elimine objetos vacíos

module.exports = mongoose.model('Respuesta', RespuestaSchema);