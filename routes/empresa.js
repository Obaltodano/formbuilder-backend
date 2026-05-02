// routes/empresa.js - Rutas para portal de empresas/gerentes (Contrato v1.0)
const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const brandingController = require('../controllers/brandingController');
const {
  verifyToken,
  requireRole,
  verifyEmpresaActiva,
  attachEmpresa
} = require('../middleware/authMiddleware');
const { uploadLogo } = require('../middleware/dynamicStorage');

// Middleware común para todas las rutas de empresa
router.use(verifyToken);
router.use(verifyEmpresaActiva);
router.use(attachEmpresa);

// ==================== BRANDING (Sección 4 del Contrato) ====================

// GET /api/empresa/branding - Obtener configuración de marca
router.get('/branding', brandingController.getBranding);

// PUT /api/empresa/branding - Actualizar branding (solo gerente/superadmin)
router.put('/branding',
  requireRole(['gerente', 'superadmin']),
  brandingController.updateBranding
);

// POST /api/empresa/logo - Subir logo (multipart)
router.post('/logo',
  requireRole(['gerente', 'superadmin']),
  uploadLogo.single('logoFile'),
  brandingController.uploadLogo
);

// ==================== USAGE & INFO ====================

// GET /api/empresa/usage - Ver uso de recursos
router.get('/usage', empresaController.getUsage);

// GET /api/empresa/limits - Ver límites del plan actual
router.get('/limits', empresaController.getLimits);

// GET /api/empresa - Información completa de la empresa
router.get('/', empresaController.getEmpresaInfo);

// GET /api/empresa/metrics - Métricas de la empresa actual
router.get('/metrics', empresaController.getEmpresaMetrics);

// PUT /api/empresa - Actualizar información general
router.put('/',
  requireRole(['gerente', 'superadmin']),
  empresaController.updateEmpresa
);

// ==================== PAGOS ====================

// GET /api/empresa/pagos - Historial de pagos
router.get('/pagos',
  requireRole(['gerente', 'superadmin']),
  empresaController.getHistorialPagos
);

// POST /api/empresa/pago - Enviar solicitud de pago
router.post('/pago',
  requireRole(['gerente', 'superadmin']),
  empresaController.solicitarPago
);

// POST /api/empresa/upgrade - Cambiar de plan
router.post('/upgrade',
  requireRole(['gerente', 'superadmin']),
  empresaController.solicitarUpgrade
);

// ==================== GRUPOS ====================

// POST /api/grupos - Crear grupo
router.post('/grupos',
  requireRole(['gerente', 'superadmin']),
  empresaController.crearGrupo
);

// GET /api/grupos - Listar grupos
router.get('/grupos', empresaController.getGrupos);

// PATCH /api/grupos/:id/usuarios - Agregar usuario a grupo
router.patch('/grupos/:id/usuarios',
  requireRole(['gerente', 'superadmin']),
  empresaController.agregarUsuarioAGrupo
);

// DELETE /api/grupos/:id/usuarios/:usuarioId - Remover usuario de grupo
router.delete('/grupos/:id/usuarios/:usuarioId',
  requireRole(['gerente', 'superadmin']),
  empresaController.removerUsuarioDeGrupo
);

// POST /api/grupos/:id/formularios - Asignar formulario a grupo
router.post('/grupos/:id/formularios',
  requireRole(['gerente', 'superadmin']),
  empresaController.asignarFormularioAGrupo
);

module.exports = router;
