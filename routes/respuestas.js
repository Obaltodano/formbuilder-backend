// routes/respuestas.js - Rutas de Respuestas (Contrato v1.0)
const express = require('express');
const router = express.Router();
const respuestaController = require('../controllers/respuestaController');
const {
  verifyToken,
  requireRole,
  verifyEmpresaActiva,
  verificarLimitesPlan
} = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para respuestas
// Los archivos se guardarán temporalmente y el controlador los moverá a la ubicación final
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Carpeta temporal
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Nombre temporal - el controlador lo renombrará
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido: ' + file.mimetype), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 10 // Máximo 10 archivos
  }
});

// Middleware de autenticación y verificación para todas las rutas
router.use(verifyToken);
router.use(verifyEmpresaActiva);

// GET /api/respuestas - Listar respuestas (todos los roles)
router.get('/', respuestaController.listarRespuestas);

// GET /api/respuestas/:id - Obtener respuesta específica
router.get('/:id', respuestaController.obtenerRespuesta);

// POST /api/respuestas - Crear respuesta (CRÍTICO: Contrato v1.0)
// 'archivo' es el nombre del campo para archivos múltiples desde el frontend
router.post('/',
  verificarLimitesPlan('respuestas'), // Verificar límite de respuestas
  upload.any(), // Aceptar múltiples archivos en campos con nombre dinámico (campoId)
  respuestaController.crearRespuesta
);

// DELETE /api/respuestas/:id - Eliminar respuesta (gerente/superadmin/creador)
router.delete('/:id', respuestaController.eliminarRespuesta);

module.exports = router;