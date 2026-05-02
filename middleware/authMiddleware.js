// middleware/authMiddleware.js - Middlewares de Autorización RBAC (Contrato v1.0)
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Empresa = require('../models/Empresa');

// 1. verifyToken - Verifica token JWT válido
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({ 
        error: 'No hay token, autorización denegada',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreta');
    
    // Buscar usuario en base de datos
    const user = await User.findById(decoded.user?.id || decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token válido pero usuario no existe',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.activo) {
      return res.status(401).json({ 
        error: 'Usuario desactivado',
        code: 'USER_INACTIVE'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifyToken:', error.message);
    return res.status(401).json({ 
      error: 'Token no válido',
      code: 'TOKEN_INVALID'
    });
  }
};

// 2. requireRole - Verifica rol específico
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // roles puede ser string o array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Rol requerido: ' + allowedRoles.join(', '),
        code: 'ROLE_REQUIRED',
        currentRole: req.user.rol,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// 3. verifyEmpresa - Verifica que el usuario pertenezca a la empresa solicitada
exports.verifyEmpresa = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Obtener empresaId de params, query o body
    const empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({ 
        error: 'empresaId es requerido',
        code: 'EMPRESA_ID_MISSING'
      });
    }

    // SuperAdmin puede acceder a cualquier empresa
    if (req.user.rol === 'superadmin') {
      req.empresaId = empresaId;
      return next();
    }

    // Gerente y Empleado solo pueden acceder a su empresa
    if (req.user.empresaId !== empresaId) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta empresa',
        code: 'EMPRESA_ACCESS_DENIED',
        userEmpresaId: req.user.empresaId,
        requestedEmpresaId: empresaId
      });
    }

    req.empresaId = empresaId;
    next();
  } catch (error) {
    console.error('Error verifyEmpresa:', error);
    return res.status(500).json({ 
      error: 'Error verificando acceso a empresa',
      code: 'VERIFY_EMPRESA_ERROR'
    });
  }
};

// 4. verifyEmpresaActiva - Verifica que la empresa esté activa
exports.verifyEmpresaActiva = async (req, res, next) => {
  try {
    // Determinar empresaId a verificar
    let empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;
    
    // Si no hay empresaId en params/query/body, usar el del usuario
    if (!empresaId && req.user) {
      empresaId = req.user.empresaId;
    }

    if (!empresaId) {
      return res.status(400).json({ 
        error: 'empresaId es requerido',
        code: 'EMPRESA_ID_MISSING'
      });
    }

    // Buscar empresa
    const empresa = await Empresa.findByEmpresaId(empresaId);

    if (!empresa) {
      return res.status(404).json({ 
        error: 'Empresa no encontrada',
        code: 'EMPRESA_NOT_FOUND'
      });
    }

    // Verificar que esté activa
    if (empresa.status !== 'activa') {
      return res.status(403).json({ 
        error: `Empresa ${empresa.status}. No se pueden realizar operaciones.`,
        code: 'EMPRESA_NOT_ACTIVE',
        status: empresa.status,
        motivo: empresa.motivoSuspension
      });
    }

    // Adjuntar empresa al request para uso posterior
    req.empresa = empresa;
    next();
  } catch (error) {
    console.error('Error verifyEmpresaActiva:', error);
    return res.status(500).json({ 
      error: 'Error verificando estado de empresa',
      code: 'VERIFY_EMPRESA_ACTIVA_ERROR'
    });
  }
};

// 5. Middleware combinado: Verificar límites del plan
exports.verificarLimitesPlan = (recurso) => {
  return async (req, res, next) => {
    try {
      const empresa = req.empresa;
      
      if (!empresa) {
        return res.status(400).json({ 
          error: 'Información de empresa no disponible',
          code: 'EMPRESA_INFO_MISSING'
        });
      }

      const limites = empresa.plan.limites;
      const usados = empresa.usados;

      // Verificar si se excedió el límite
      if (usados[recurso] >= limites[recurso]) {
        return res.status(403).json({ 
          error: `Límite de ${recurso} alcanzado (${limites[recurso]}). Actualice su plan.`,
          code: 'LIMITE_PLAN_EXCEDIDO',
          recurso,
          limite: limites[recurso],
          usado: usados[recurso]
        });
      }

      next();
    } catch (error) {
      console.error('Error verificarLimitesPlan:', error);
      return res.status(500).json({ 
        error: 'Error verificando límites del plan',
        code: 'VERIFY_LIMITES_ERROR'
      });
    }
  };
};

// Middleware opcional: Adjuntar empresa al request
exports.attachEmpresa = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const empresa = await Empresa.findByEmpresaId(req.user.empresaId);
    if (empresa) {
      req.empresa = empresa;
    }
    next();
  } catch (error) {
    console.error('Error attachEmpresa:', error);
    next();
  }
};

// Middleware de debugging (opcional, para desarrollo)
exports.debugAuth = (req, res, next) => {
  console.log('=== DEBUG AUTH ===');
  console.log('Headers:', req.headers);
  console.log('User:', req.user);
  console.log('Empresa:', req.empresa);
  console.log('==================');
  next();
};
