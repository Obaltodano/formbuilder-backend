// routes/formularios.js - Rutas de Formularios (Contrato v1.0)
const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { 
  verifyToken, 
  requireRole, 
  verifyEmpresaActiva,
  verificarLimitesPlan 
} = require('../middleware/authMiddleware');
const Empresa = require('../models/Empresa');

// Middleware de verificación de empresa activa para todas las rutas
router.use(verifyToken);
router.use(verifyEmpresaActiva);

// GET /api/formularios - Listar formularios (todos los roles)
router.get('/', formController.obtenerFormularios);

// GET /api/formularios/:id - Obtener un formulario específico
router.get('/:id', formController.obtenerFormularioPorId);

// POST /api/formularios - Crear formulario (solo gerente/superadmin)
router.post('/', 
  requireRole(['gerente', 'superadmin']),
  verificarLimitesPlan('formularios'),
  formController.crearFormulario
);

// PUT /api/formularios/:id - Actualizar formulario (solo gerente/superadmin)
router.put('/:id', 
  requireRole(['gerente', 'superadmin']),
  formController.actualizarFormulario
);

// DELETE /api/formularios/:id - Eliminar formulario (solo gerente/superadmin)
router.delete('/:id', 
  requireRole(['gerente', 'superadmin']),
  formController.eliminarFormulario
);

// PATCH /api/formularios/:id/activar - Activar/desactivar formulario
router.patch('/:id/activar', 
  requireRole(['gerente', 'superadmin']),
  formController.toggleActivo
);

module.exports = router;