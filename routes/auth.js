const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta: /api/auth/register
router.post('/register', authController.register);

// Ruta: /api/auth/login
router.post('/login', authController.login);

module.exports = router;