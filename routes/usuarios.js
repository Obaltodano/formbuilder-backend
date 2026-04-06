const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET api/usuarios/equipo
// @desc    Obtener todo el personal de la empresa del gerente
router.get('/equipo', auth, async (req, res) => {
    try {
        // NOTA: Revisa si tu middleware usa 'req.user' o 'req.usuario'
        // Según tu código anterior, suele ser 'req.user'
        const idEmpresa = req.user?.empresaId || req.usuario?.empresaId;

        const personal = await User.find({ 
            empresaId: idEmpresa 
        }).select('-password'); // Excluimos la contraseña por seguridad

        res.json(personal);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener el equipo');
    }
});

// @route   POST api/usuarios/registro-equipo
router.post('/registro-equipo', auth, async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const empresaId = req.user?.empresaId || req.usuario?.empresaId;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'El usuario ya existe' });

        user = new User({
            nombre,
            email,
            password, // Recuerda hashear esto si no tienes un pre-save hook
            rol,
            empresaId
        });

        await user.save();
        res.json({ msg: 'Usuario creado con éxito' });
    } catch (err) {
        res.status(500).send('Error al registrar');
    }
});

module.exports = router;