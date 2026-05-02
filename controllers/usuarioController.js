// controllers/usuarioController.js - Controlador de Usuarios/Gestión de Equipo (Contrato v1.0)
const User = require('../models/User');
const Empresa = require('../models/Empresa');

// GET /api/usuarios/equipo - Listar equipo de la empresa
exports.getEquipo = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;

    // Si es superadmin, puede ver todos los usuarios de cualquier empresa (si se pasa empresaId)
    const filtroEmpresa = req.user.rol === 'superadmin' && req.query.empresaId
      ? req.query.empresaId
      : empresaId;

    const equipo = await User.find({ empresaId: filtroEmpresa })
      .select('-password')
      .sort({ nombre: 1 });

    res.json({
      exito: true,
      count: equipo.length,
      data: equipo
    });
  } catch (error) {
    console.error('Error en getEquipo:', error);
    res.status(500).json({
      error: 'Error al obtener el equipo',
      code: 'SERVER_ERROR'
    });
  }
};

// POST /api/usuarios/registro-equipo - Crear usuario en la empresa
exports.registrarEquipo = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'empleado' } = req.body;
    const empresaId = req.user.empresaId;

    // Validaciones
    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: nombre, email, password',
        code: 'MISSING_FIELDS'
      });
    }

    // Validar rol permitido
    const rolesPermitidos = ['empleado', 'gerente'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({
        error: `Rol no válido. Permitidos: ${rolesPermitidos.join(', ')}`,
        code: 'INVALID_ROLE'
      });
    }

    // Verificar si el email ya existe
    const usuarioExistente = await User.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(409).json({
        error: 'El email ya está registrado',
        code: 'EMAIL_EXISTS'
      });
    }

    // Crear usuario
    const nuevoUsuario = new User({
      nombre,
      email: email.toLowerCase(),
      password,
      rol,
      empresaId,
      activo: true
    });

    await nuevoUsuario.save();

    // Incrementar contador de usuarios de la empresa
    const empresa = req.empresa;
    if (empresa) {
      await empresa.incrementarContador('usuarios');
    }

    res.status(201).json({
      exito: true,
      mensaje: 'Usuario creado exitosamente',
      data: {
        _id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        empresaId: nuevoUsuario.empresaId,
        activo: nuevoUsuario.activo
      }
    });
  } catch (error) {
    console.error('Error en registrarEquipo:', error);
    res.status(500).json({
      error: 'Error al registrar usuario',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};

// DELETE /api/usuarios/:id - Eliminar usuario del equipo
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;
    const rol = req.user.rol;

    const usuario = await User.findOne({ _id: id, empresaId });
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // No permitir eliminar al último gerente
    if (usuario.rol === 'gerente') {
      const gerentesCount = await User.countDocuments({ empresaId, rol: 'gerente', activo: true });
      if (gerentesCount <= 1) {
        return res.status(400).json({
          error: 'No se puede eliminar al único gerente de la empresa',
          code: 'LAST_GERENTE'
        });
      }
    }

    // Soft delete: marcar como inactivo
    usuario.activo = false;
    await usuario.save();

    res.json({
      exito: true,
      mensaje: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    res.status(500).json({
      error: 'Error al eliminar usuario',
      code: 'SERVER_ERROR'
    });
  }
};

// PATCH /api/usuarios/:id/activar - Activar/desactivar usuario
exports.toggleActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;

    const usuario = await User.findOne({ _id: id, empresaId });
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // No permitir desactivar al último gerente
    if (usuario.rol === 'gerente' && usuario.activo) {
      const gerentesCount = await User.countDocuments({ empresaId, rol: 'gerente', activo: true });
      if (gerentesCount <= 1) {
        return res.status(400).json({
          error: 'No se puede desactivar al único gerente de la empresa',
          code: 'LAST_GERENTE'
        });
      }
    }

    usuario.activo = !usuario.activo;
    await usuario.save();

    res.json({
      exito: true,
      mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}`,
      data: { activo: usuario.activo }
    });
  } catch (error) {
    console.error('Error en toggleActivo:', error);
    res.status(500).json({
      error: 'Error cambiando estado del usuario',
      code: 'SERVER_ERROR'
    });
  }
};
