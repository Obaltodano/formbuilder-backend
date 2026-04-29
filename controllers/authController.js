// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { nombre, email, password, rol, empresaId } = req.body;

        // Validaciones
        if (!nombre || !email || !password || !empresaId) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        // Verificar si usuario existe
        const usuarioExistente = await User.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ error: "El email ya está registrado" });
        }

        // Crear usuario
        const nuevoUsuario = new User({
            nombre,
            email,
            password,
            rol: rol || 'empleado',
            empresaId
        });

        await nuevoUsuario.save();

        // Generar token
        const token = jwt.sign(
            { id: nuevoUsuario._id, rol: nuevoUsuario.rol, empresaId: nuevoUsuario.empresaId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol,
                empresaId: nuevoUsuario.empresaId
            }
        });
    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Intento de login para:", email); // Esto saldrá en tu terminal

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ error: "Usuario no existe" });
        }

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(400).json({ error: "Clave incorrecta" });
        }


       const token = jwt.sign(
        { id: usuario._id, rol: usuario.rol, empresaId: usuario.empresaId },
        process.env.JWT_SECRET, // <--- Usa la variable del .env
        { expiresIn: '24h' }
            );

        res.json({
            token,
            usuario: { 
                id: usuario.id,
                nombre: usuario.nombre, 
                rol: usuario.rol, 
                empresaId: usuario.empresaId 
            }
        });
    } catch (err) {
        console.error("DETALLE DEL ERROR EN SERVER:", err); // MIRA ESTO EN LA TERMINAL
        res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
    }
};