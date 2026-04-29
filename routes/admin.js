// routes/admin.js - Rutas SuperAdmin para SaaS
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Middleware para verificar rol superadmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso restringido a superadministradores' });
  }
  next();
};

// ==================== METRICS & DASHBOARD ====================

// GET /api/admin/metrics - Dashboard metrics
router.get('/metrics', auth, requireSuperAdmin, adminController.getMetrics);

// ==================== EMPRESAS ====================

// GET /api/admin/empresas - Listar empresas
router.get('/empresas', auth, requireSuperAdmin, adminController.getEmpresas);

// PATCH /api/admin/empresas/:id/suspender - Suspender empresa
router.patch('/empresas/:id/suspender', auth, requireSuperAdmin, adminController.suspenderEmpresa);

// PATCH /api/admin/empresas/:id/activar - Activar empresa
router.patch('/empresas/:id/activar', auth, requireSuperAdmin, adminController.activarEmpresa);

// ==================== PLANES ====================

// GET /api/admin/planes - Listar todos los planes (admin)
router.get('/planes', auth, requireSuperAdmin, async (req, res) => {
  try {
    const Plan = require('../models/Plan');
    const planes = await Plan.find().sort({ orden: 1 });
    res.json({ exito: true, data: planes });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo planes' });
  }
});

// POST /api/admin/planes - Crear plan
router.post('/planes', auth, requireSuperAdmin, adminController.crearPlan);

// PUT /api/admin/planes/:id - Actualizar plan
router.put('/planes/:id', auth, requireSuperAdmin, adminController.actualizarPlan);

// PATCH /api/admin/planes/:id/toggle - Activar/Desactivar plan
router.patch('/planes/:id/toggle', auth, requireSuperAdmin, async (req, res) => {
  try {
    const Plan = require('../models/Plan');
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
    
    plan.isActive = !plan.isActive;
    await plan.save();
    
    res.json({
      exito: true,
      mensaje: `Plan ${plan.isActive ? 'activado' : 'desactivado'}`,
      data: plan
    });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando plan' });
  }
});

// ==================== PAGOS ====================

// GET /api/admin/pagos - Listar pagos
router.get('/pagos', auth, requireSuperAdmin, adminController.getPagos);

// PATCH /api/admin/pagos/:id/aprobar - Aprobar pago
router.patch('/pagos/:id/aprobar', auth, requireSuperAdmin, adminController.aprobarPago);

// PATCH /api/admin/pagos/:id/rechazar - Rechazar pago
router.patch('/pagos/:id/rechazar', auth, requireSuperAdmin, adminController.rechazarPago);

// ==================== CUPONES ====================

// GET /api/admin/cupones - Listar cupones
router.get('/cupones', auth, requireSuperAdmin, async (req, res) => {
  try {
    const Cupon = require('../models/Cupon');
    const cupones = await Cupon.find().sort({ createdAt: -1 });
    res.json({ exito: true, data: cupones });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo cupones' });
  }
});

// POST /api/admin/cupones - Crear cupón
router.post('/cupones', auth, requireSuperAdmin, adminController.crearCupon);

// PATCH /api/admin/cupones/:id/toggle - Activar/Desactivar cupón
router.patch('/cupones/:id/toggle', auth, requireSuperAdmin, async (req, res) => {
  try {
    const Cupon = require('../models/Cupon');
    const cupon = await Cupon.findById(req.params.id);
    if (!cupon) return res.status(404).json({ error: 'Cupón no encontrado' });
    
    cupon.isActive = !cupon.isActive;
    await cupon.save();
    
    res.json({
      exito: true,
      mensaje: `Cupón ${cupon.isActive ? 'activado' : 'desactivado'}`,
      data: cupon
    });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando cupón' });
  }
});

module.exports = router;
