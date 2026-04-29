// routes/public.js - Rutas públicas para marketplace
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// GET /api/public/planes - Listar planes públicos
router.get('/planes', publicController.getPlanesPublicos);

// GET /api/public/planes/:slug - Detalle de un plan
router.get('/planes/:slug', publicController.getPlanBySlug);

// POST /api/public/cupones/validar - Validar cupón
router.post('/cupones/validar', publicController.validarCupon);

// POST /api/public/registro - Registrar nueva empresa
router.post('/registro', publicController.registrarEmpresa);

// GET /api/public/estadisticas - Estadísticas públicas
router.get('/estadisticas', publicController.getEstadisticasPublicas);

module.exports = router;
