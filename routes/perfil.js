// routes/perfil.js - Rutas de Perfil de Usuario (Contrato v1.0)
const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadPerfil } = require('../middleware/dynamicStorage');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/usuarios/perfil - Obtener perfil
router.get('/perfil', perfilController.getPerfil);

// PUT /api/usuarios/perfil - Actualizar perfil
router.put('/perfil', perfilController.updatePerfil);

// POST /api/usuarios/perfil/foto - Subir foto de perfil
router.post('/perfil/foto', uploadPerfil.single('fotoPerfil'), perfilController.uploadFoto);

// PUT /api/usuarios/password - Cambiar contraseña
router.put('/password', perfilController.changePassword);

module.exports = router;
