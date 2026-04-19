// backend/controllers/userController.js
const User = require('../models/User'); // <--- ESTO FALTABA (Importante)

// Obtener datos del perfil actual
exports.obtenerPerfil = async (req, res) => {
    try {
        // req.user.id viene del middleware auth
        const usuario = await User.findById(req.user.id).select('-password');
        if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al obtener perfil");
    }
};

// Actualizar datos de texto
exports.actualizarPerfil = async (req, res) => {
    try {
        const { nombre, dni, telefono } = req.body;
        const userId = req.user.id;

        const usuarioActualizado = await User.findByIdAndUpdate(
            userId,
            { 
                $set: { 
                    nombre, 
                    dni, 
                    telefono,
                    perfilCompletado: true 
                } 
            },
            { new: true }
        ).select('-password');

        res.json({ msg: "Perfil actualizado con éxito", user: usuarioActualizado });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al actualizar perfil");
    }
};

// backend/controllers/userController.js
const fs = require('fs');
const path = require('path');


exports.subirFoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: "No se recibió archivo" });

        // 1. Buscamos al usuario en la DB para asegurar que tenemos los datos reales
        const usuarioDB = await User.findById(req.user.id);
        if (!usuarioDB) return res.status(404).json({ msg: "Usuario no encontrado" });

        // 2. Usamos los datos de la DB para evitar el 'undefined'
        const empresa = usuarioDB.empresaId.toString().replace(/\s+/g, '-');
        const empleado = usuarioDB.nombre.toString().replace(/\s+/g, '-');
        
        const relativePath = path.join(empresa, empleado, 'perfil');
        const absolutePath = path.join(__dirname, '..', 'uploads', relativePath);

        // 3. Crear carpetas de forma segura
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }

        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        const finalLocation = path.join(absolutePath, fileName);

        // 4. Mover archivo
        fs.renameSync(req.file.path, finalLocation);

        // 5. Guardar ruta completa en DB
        const dbPath = `uploads/${empresa}/${empleado}/perfil/${fileName}`;
        usuarioDB.fotoUrl = dbPath;
        await usuarioDB.save();

        res.json({ 
            msg: "Foto actualizada", 
            fotoUrl: dbPath 
        });

    } catch (error) {
        console.error("Error en subirFoto:", error);
        res.status(500).json({ error: error.message });
    }
};