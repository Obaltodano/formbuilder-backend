const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const perfilController = require('../controllers/perfilController');
const usuarioController = require('../controllers/usuarioController');
const { verifyToken } = require('../middleware/authMiddleware');

// Ruta: /api/auth/register
router.post('/register', authController.register);

// Ruta: /api/auth/login
router.post('/login', authController.login);

// Ruta: /api/auth/verify (Verificar token)
router.get('/verify', verifyToken, authController.verify);

// Ruta: /api/auth/logout (Logout)
router.post('/logout', verifyToken, authController.logout);

// Alias para compatibilidad con frontend (perfil)
router.get('/profile', verifyToken, perfilController.getPerfil);
router.put('/profile', verifyToken, perfilController.updatePerfil);

// Alias para compatibilidad con frontend (equipo)
router.get('/usuarios', verifyToken, usuarioController.getEquipo);

// Ruta: /api/auth/change-password
router.post('/change-password', verifyToken, perfilController.changePassword);

module.exports = router;