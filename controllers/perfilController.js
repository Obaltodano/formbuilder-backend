// controllers/perfilController.js - Controlador de Perfil (Contrato v1.0)
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/usuarios/perfil
exports.getPerfil = async (req, res) => {
  try {
    const usuario = await User.findById(req.user._id).select('-password');
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      exito: true,
      data: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        fotoUrl: usuario.fotoUrl,
        perfil: usuario.perfil,
        configuracion: usuario.configuracion,
        ultimoAcceso: usuario.ultimoAcceso,
        createdAt: usuario.createdAt
      }
    });
  } catch (error) {
    console.error('Error en getPerfil:', error);
    res.status(500).json({
      error: 'Error obteniendo perfil',
      code: 'SERVER_ERROR'
    });
  }
};

// PUT /api/usuarios/perfil
exports.updatePerfil = async (req, res) => {
  try {
    const { nombre, perfil } = req.body;
    
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (perfil) updateData.perfil = perfil;

    const usuario = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      exito: true,
      mensaje: 'Perfil actualizado exitosamente',
      data: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        fotoUrl: usuario.fotoUrl,
        perfil: usuario.perfil,
        configuracion: usuario.configuracion
      }
    });
  } catch (error) {
    console.error('Error en updatePerfil:', error);
    res.status(500).json({
      error: 'Error actualizando perfil',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};

// POST /api/usuarios/perfil/foto
exports.uploadFoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se proporcionó ninguna foto',
        code: 'NO_FILE'
      });
    }

    // Obtener ruta relativa del archivo
    const fotoUrl = req.file.path.replace(/\\/g, '/');

    const usuario = await User.findByIdAndUpdate(
      req.user._id,
      { fotoUrl },
      { new: true }
    ).select('-password');

    res.json({
      exito: true,
      mensaje: 'Foto de perfil actualizada',
      fotoUrl,
      data: {
        _id: usuario._id,
        nombre: usuario.nombre,
        fotoUrl: usuario.fotoUrl
      }
    });
  } catch (error) {
    console.error('Error en uploadFoto:', error);
    res.status(500).json({
      error: 'Error subiendo foto',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};

// PUT /api/usuarios/password
exports.changePassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        error: 'Se requiere contraseña actual y nueva',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Buscar usuario con contraseña
    const usuario = await User.findById(req.user._id);

    // Verificar contraseña actual
    const esValida = await bcrypt.compare(passwordActual, usuario.password);
    if (!esValida) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        code: 'INVALID_PASSWORD'
      });
    }

    // Validar nueva contraseña
    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Actualizar contraseña
    usuario.password = passwordNuevo;
    await usuario.save();

    res.json({
      exito: true,
      mensaje: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      error: 'Error cambiando contraseña',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};
