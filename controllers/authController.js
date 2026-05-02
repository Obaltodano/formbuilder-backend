// controllers/authController.js - Controlador de Autenticación (Contrato v1.0)
const User = require('../models/User');
const Empresa = require('../models/Empresa');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper para generar token JWT
const generarToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      rol: user.rol, 
      empresaId: user.empresaId 
    },
    process.env.JWT_SECRET || 'secreta',
    { expiresIn: '24h' }
  );
};

// Helper para formatear respuesta de usuario según contrato
const formatUserResponse = (user, empresa = null) => {
  const userData = {
    _id: user._id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    empresaId: user.empresaId,
    fotoUrl: user.fotoUrl,
    perfil: user.perfil,
    configuracion: user.configuracion
  };

  // Si hay empresa, incluirla en la respuesta (para login)
  if (empresa) {
    userData.empresa = {
      nombre: empresa.nombre,
      status: empresa.status,
      branding: empresa.branding,
      plan: empresa.plan
    };
  }

  return userData;
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, empresaId } = req.body;

    // Validaciones
    if (!nombre || !email || !password || !empresaId) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos",
        code: "MISSING_FIELDS"
      });
    }

    // Verificar si empresa existe
    const empresa = await Empresa.findByEmpresaId(empresaId);
    if (!empresa) {
      return res.status(404).json({ 
        error: "Empresa no encontrada",
        code: "EMPRESA_NOT_FOUND"
      });
    }

    // Verificar si usuario existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({ 
        error: "El email ya está registrado",
        code: "EMAIL_EXISTS"
      });
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

    // Incrementar contador de usuarios de la empresa
    await empresa.incrementarContador('usuarios');

    // Generar token
    const token = generarToken(nuevoUsuario);

    res.status(201).json({
      exito: true,
      mensaje: "Usuario registrado exitosamente",
      token,
      user: formatUserResponse(nuevoUsuario, empresa)
    });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ 
      error: "Error interno del servidor", 
      code: "SERVER_ERROR",
      detalle: err.message 
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Intento de login para:", email);

    // Buscar usuario con populate de empresa
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ 
        error: "Credenciales inválidas",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Verificar si usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({ 
        error: "Usuario desactivado. Contacte al administrador.",
        code: "USER_INACTIVE"
      });
    }

    // Verificar contraseña
    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ 
        error: "Credenciales inválidas",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Buscar información de la empresa (excepto para SuperAdmin)
    let empresa = null;
    
    if (usuario.rol === 'superadmin' && usuario.empresaId === 'SISTEMA_GLOBAL') {
      console.log("   � SuperAdmin detectado - sin empresa requerida");
    } else {
      console.log("�🔍 Buscando empresa para usuario:", usuario.email);
      console.log("   empresaId del usuario:", usuario.empresaId);
      
      empresa = await Empresa.findByEmpresaId(usuario.empresaId);
      console.log("   Resultado búsqueda:", empresa ? `✅ ${empresa.nombre}` : "❌ No encontrada");
      
      if (!empresa) {
        // Verificar todas las empresas disponibles
        const todasEmpresas = await Empresa.find({}).select('empresaId nombre');
        console.log("   Empresas disponibles:", todasEmpresas.map(e => e.empresaId));
        
        return res.status(404).json({ 
          error: "Empresa asociada no encontrada",
          code: "EMPRESA_NOT_FOUND",
          debug: {
            usuarioEmpresaId: usuario.empresaId,
            empresasDisponibles: todasEmpresas.map(e => e.empresaId)
          }
        });
      }

      // Verificar si empresa está activa
      if (empresa.status !== 'activa') {
        return res.status(403).json({ 
          error: `Empresa ${empresa.status}. Contacte al administrador.`,
          code: "EMPRESA_NOT_ACTIVE",
          status: empresa.status
        });
      }
    }

    // Actualizar último acceso
    await usuario.actualizarUltimoAcceso();

    // Generar token
    const token = generarToken(usuario);

    console.log("✅ Login exitoso:", usuario.email, "| Rol:", usuario.rol);

    // Respuesta según contrato v1.0
    res.json({
      exito: true,
      token,
      user: formatUserResponse(usuario, empresa)
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ 
      error: "Error interno del servidor",
      code: "SERVER_ERROR",
      detalle: err.message 
    });
  }
};

// GET /api/auth/verify - Verificar token
exports.verify = async (req, res) => {
  try {
    // El middleware verifyToken ya adjuntó el usuario
    const usuario = await User.findById(req.user._id).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ 
        error: "Usuario no encontrado",
        code: "USER_NOT_FOUND"
      });
    }

    // Buscar empresa
    const empresa = await Empresa.findByEmpresaId(usuario.empresaId);

    res.json({
      exito: true,
      valido: true,
      user: formatUserResponse(usuario, empresa)
    });
  } catch (err) {
    console.error("Error en verify:", err);
    res.status(500).json({ 
      error: "Error verificando token",
      code: "VERIFY_ERROR"
    });
  }
};

// POST /api/auth/logout - Cerrar sesión
exports.logout = async (req, res) => {
  // En JWT no hay "logout" server-side real, pero podemos:
  // 1. Registrar el logout en logs
  // 2. Implementar blacklist de tokens (opcional)
  
  console.log("👋 Logout:", req.user.email);
  
  res.json({
    exito: true,
    mensaje: "Sesión cerrada exitosamente"
  });
};