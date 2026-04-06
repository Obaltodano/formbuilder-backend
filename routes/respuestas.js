const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');


// MODIFICACIÓN EN respuestas.js
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Si req.body está vacío, usamos una carpeta temporal para que Multer no falle
    // El error 500 ocurre porque mkdirSync falla si no recibe strings válidos
    const empresa = (req.body.empresaId || 'general').toString().replace(/\s+/g, '-');
    const empleado = (req.body.nombreEmpleado || 'anonimo').toString().replace(/\s+/g, '-');
    const form = (req.body.nombreFormulario || 'sin-titulo').toString().replace(/\s+/g, '-');
    
    // Aseguramos que la ruta sea relativa al proyecto
    const folderPath = path.join(__dirname, '..', 'uploads', empresa, empleado, form);

    try {
      // Creamos la carpeta de forma síncrona
      fs.mkdirSync(folderPath, { recursive: true });
      cb(null, folderPath);
    } catch (err) {
      console.error("Error creando carpetas:", err);
      cb(err, null); // Esto enviará el error real al cliente
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// En tu modelo Respuesta.js
const respuestaSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  formularioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Formulario' },
  datos: { type: Object }, // <--- Asegúrate de que sea Object o Schema.Types.Mixed
  fechaEnvio: { type: Date, default: Date.now }
});

const upload = multer({ storage: storage });

// Aplicamos el middleware de subida antes del controlador
// 'archivo' debe ser el nombre del campo que envías desde el Frontend
router.post('/', auth, upload.any(), formController.guardarRespuesta);

router.get('/', auth, formController.listarRespuestas);

module.exports = router;