// routes/empresa.js - Rutas para portal de empresas/gerentes
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const empresaController = require('../controllers/empresaController');
const { uploadComprobante, handleMulterError, extractUploadedFiles } = require('../middleware/dynamicStorage');
const { checkSaaSLimits, checkEnterpriseStatus, getUsageStats } = require('../middleware/saasMiddleware');

// Middleware para verificar rol gerente o superior
const requireGerente = (req, res, next) => {
  if (!['gerente', 'superadmin'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Acceso restringido a gerentes' });
  }
  next();
};

// ==================== USAGE & INFO ====================

// GET /api/empresa/usage - Ver uso de recursos
router.get('/usage', 
  auth, 
  checkEnterpriseStatus, 
  getUsageStats, 
  empresaController.getUsage
);

// GET /api/empresa - Información de la empresa
router.get('/', 
  auth, 
  checkEnterpriseStatus, 
  empresaController.getEmpresaInfo
);

// PUT /api/empresa - Actualizar información
router.put('/', 
  auth, 
  requireGerente,
  checkEnterpriseStatus, 
  empresaController.updateEmpresa
);

// ==================== PAGOS ====================

// POST /api/empresa/pago - Enviar solicitud de pago
router.post('/pago', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  uploadComprobante.single('comprobante'),
  handleMulterError,
  extractUploadedFiles,
  empresaController.solicitarPago
);

// GET /api/empresa/pagos - Historial de pagos
router.get('/pagos', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  empresaController.getHistorialPagos
);

// POST /api/empresa/upgrade - Cambiar de plan
router.post('/upgrade', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  empresaController.solicitarUpgrade
);

// ==================== GRUPOS ====================

// POST /api/grupos - Crear grupo
router.post('/grupos', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  checkSaaSLimits('grupos'),
  empresaController.crearGrupo
);

// GET /api/grupos - Listar grupos
router.get('/grupos', 
  auth, 
  checkEnterpriseStatus,
  empresaController.getGrupos
);

// PATCH /api/grupos/:id/usuarios - Agregar usuario a grupo
router.patch('/grupos/:id/usuarios', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  empresaController.agregarUsuarioAGrupo
);

// DELETE /api/grupos/:id/usuarios/:usuarioId - Remover usuario de grupo
router.delete('/grupos/:id/usuarios/:usuarioId', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  empresaController.removerUsuarioDeGrupo
);

// POST /api/grupos/:id/formularios - Asignar formulario a grupo
router.post('/grupos/:id/formularios', 
  auth, 
  requireGerente,
  checkEnterpriseStatus,
  empresaController.asignarFormularioAGrupo
);

module.exports = router;
