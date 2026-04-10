const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta'); // Para clonar a empresas

// Middleware para verificar si es superadmin
const esSuperadmin = (req, res, next) => {
    if (req.user.rol !== 'superadmin') {
        return res.status(403).json({ msg: 'Acceso denegado: Se requiere rol SuperAdmin' });
    }
    next();
};

// @route   POST api/backoffice/market/subir
// @desc    Publicar una plantilla en la tienda virtual
router.post('/market/subir', [auth, esSuperadmin], async (req, res) => {
    try {
        const { titulo, descripcion, categoria, campos } = req.body;
        
        const nuevaPlantilla = new Formulario({
            titulo,
            descripcion,
            categoria,
            campos,
            empresaId: 'SISTEMA', // Identificador global
            esPlantilla: true,
            creadoPor: req.user.id
        });

        await nuevaPlantilla.save();
        res.json({ msg: 'Plantilla publicada con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al publicar en el marketplace');
    }
});

// @route   POST api/backoffice/alta-empresa
// @desc    Registrar una nueva empresa (Gerente inicial)
router.post('/alta-empresa', [auth, esSuperadmin], async (req, res) => {
    const { nombre, email, password, empresaId } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'El usuario ya existe' });

        user = new User({
            nombre,
            email,
            password, // Asegúrate de que tu modelo de User tenga el pre-save para bcrypt
            empresaId, // Este ID agrupará a toda la organización
            rol: 'gerente'
        });

        await user.save();
        res.json({ msg: `Empresa ${empresaId} creada con éxito. Gerente: ${nombre}` });
    } catch (err) {
    console.error("DETALLE DEL ERROR 500:", err); // Esto imprimirá el error real en tu consola negra
    res.status(500).json({ 
        error: 'Error al dar de alta empresa', 
        detalles: err.message 
    });
}
});

// routes/backoffice.js

// @route   GET api/backoffice/reportes-globales
// @desc    Obtener todos los reportes de todas las empresas
router.get('/reportes-globales', [auth, esSuperadmin], async (req, res) => {
    try {
        // Buscamos todas las respuestas y traemos datos del usuario y el formulario
        const reportes = await Respuesta.find()
            .populate('usuarioId', 'nombre email empresaId') 
            .populate('formularioId', 'titulo')
            .sort({ fechaEnvio: -1 });

        res.json(reportes);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener reportes globales');
    }
});

module.exports = router;