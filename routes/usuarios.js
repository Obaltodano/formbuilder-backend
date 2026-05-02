// routes/usuarios.js - Rutas de Usuarios/Gestión de Equipo (Contrato v1.0)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Empresa = require('../models/Empresa');
const usuarioController = require('../controllers/usuarioController');
const {
  verifyToken,
  requireRole,
  verifyEmpresaActiva,
  verificarLimitesPlan
} = require('../middleware/authMiddleware');

// Middleware común para todas las rutas
router.use(verifyToken);
router.use(verifyEmpresaActiva);

// ==================== GESTIÓN DE EQUIPO (Gerente) ====================

// GET /api/usuarios/equipo - Listar equipo de la empresa
router.get('/equipo', usuarioController.getEquipo);

// POST /api/usuarios/registro-equipo - Crear usuario en la empresa
// Verifica límite de usuarios del plan antes de crear
router.post('/registro-equipo',
  requireRole(['gerente', 'superadmin']),
  verificarLimitesPlan('usuarios'),
  usuarioController.registrarEquipo
);

// DELETE /api/usuarios/:id - Eliminar usuario del equipo
router.delete('/:id',
  requireRole(['gerente', 'superadmin']),
  usuarioController.eliminarUsuario
);

// PATCH /api/usuarios/:id/activar - Activar/desactivar usuario
router.patch('/:id/activar',
  requireRole(['gerente', 'superadmin']),
  usuarioController.toggleActivo
);

module.exports = router;