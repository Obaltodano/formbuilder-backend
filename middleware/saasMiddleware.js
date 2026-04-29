// middleware/saasMiddleware.js - Middlewares de control SaaS
const Empresa = require('../models/Empresa');
const User = require('../models/User');
const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta');

/**
 * Middleware: checkEnterpriseStatus
 * Verifica que la empresa del usuario esté activa
 * Si está suspendida, rechaza todas las peticiones excepto pagos
 */
const checkEnterpriseStatus = async (req, res, next) => {
  try {
    // Obtener empresaId del usuario autenticado
    const empresaId = req.user?.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({ 
        error: 'No se encontró la empresa asociada al usuario' 
      });
    }
    
    // Buscar empresa
    const empresa = await Empresa.findById(empresaId);
    
    if (!empresa) {
      return res.status(404).json({ 
        error: 'Empresa no encontrada',
        code: 'EMPRESA_NOT_FOUND'
      });
    }
    
    // Verificar si está eliminada (soft delete)
    if (empresa.isDeleted) {
      return res.status(403).json({
        error: 'La empresa ha sido eliminada. Contacte al administrador.',
        status: 'eliminado',
        code: 'EMPRESA_DELETED'
      });
    }
    
    // Verificar estados que bloquean operaciones
    const estadosBloqueantes = ['suspendido', 'pendiente_pago'];
    
    if (estadosBloqueantes.includes(empresa.status)) {
      // Permitir solo endpoints de pago
      const rutasPagoPermitidas = [
        '/api/empresa/pago',
        '/api/empresa/pagos',
        '/api/public/planes'
      ];
      
      const esRutaPago = rutasPagoPermitidas.some(ruta => 
        req.path.includes(ruta)
      );
      
      if (!esRutaPago) {
        return res.status(403).json({
          error: empresa.status === 'suspendido' 
            ? 'Empresa suspendida. Contacte al administrador.'
            : 'Pago pendiente. Por favor regularice su suscripción.',
          status: empresa.status,
          motivo: empresa.motivoSuspension || null,
          fechaVencimiento: empresa.configuracionPlan?.fechaVencimiento,
          code: empresa.status === 'suspendido' ? 'EMPRESA_SUSPENDED' : 'PAGO_PENDIENTE',
          accionRequerida: empresa.status === 'suspendido' ? 'contactar_admin' : 'realizar_pago'
        });
      }
    }
    
    // Adjuntar empresa al request para uso posterior
    req.empresa = empresa;
    
    next();
    
  } catch (error) {
    console.error('Error en checkEnterpriseStatus:', error);
    return res.status(500).json({
      error: 'Error verificando estado de la empresa',
      code: 'CHECK_STATUS_ERROR'
    });
  }
};

/**
 * Middleware: checkSaaSLimits
 * Verifica que la empresa no haya excedido los límites de su plan
 * Tipos de límite: 'usuarios', 'formularios', 'almacenamiento', 'respuestas'
 */
const checkSaaSLimits = (tipoLimite) => {
  return async (req, res, next) => {
    try {
      const empresa = req.empresa;
      
      if (!empresa) {
        return res.status(500).json({
          error: 'Información de empresa no disponible',
          code: 'EMPRESA_DATA_MISSING'
        });
      }
      
      const plan = empresa.configuracionPlan;
      
      if (!plan) {
        return res.status(500).json({
          error: 'Configuración de plan no disponible',
          code: 'PLAN_CONFIG_MISSING'
        });
      }
      
      let usado = 0;
      let limite = 0;
      let mensajeError = '';
      
      switch (tipoLimite) {
        case 'usuarios':
          usado = await User.countDocuments({ 
            empresaId: empresa._id,
            isActive: { $ne: false }
          });
          limite = plan.limiteUsuarios;
          mensajeError = `Límite de usuarios alcanzado (${limite}). Actualice su plan.`;
          break;
          
        case 'formularios':
          usado = await Formulario.countDocuments({ 
            empresaId: empresa._id,
            isDeleted: { $ne: true }
          });
          limite = plan.limiteFormularios;
          mensajeError = `Límite de formularios alcanzado (${limite}). Actualice su plan.`;
          break;
          
        case 'almacenamiento':
          usado = plan.usadoGB || 0;
          limite = plan.almacenamientoMaxGB;
          mensajeError = `Límite de almacenamiento alcanzado (${limite} GB). Elimine archivos o actualice su plan.`;
          break;
          
        case 'grupos':
          const Grupo = require('../models/Grupo');
          usado = await Grupo.countDocuments({ 
            empresaId: empresa._id,
            isDeleted: false
          });
          // Obtener límite de grupos del plan referenciado
          const Plan = require('../models/Plan');
          const planDetails = await Plan.findById(plan.planId);
          limite = planDetails?.caracteristicas?.maxGrupos || 3;
          mensajeError = `Límite de grupos alcanzado (${limite}). Actualice su plan.`;
          break;
          
        default:
          return res.status(500).json({
            error: 'Tipo de límite no válido',
            code: 'INVALID_LIMIT_TYPE'
          });
      }
      
      // Verificar si se excedió el límite
      if (usado >= limite) {
        return res.status(403).json({
          error: mensajeError,
          code: 'LIMIT_EXCEEDED',
          tipoLimite,
          usado,
          limite,
          disponible: Math.max(0, limite - usado),
          upgradeRecomendado: true
        });
      }
      
      // Adjuntar información de uso al request
      req.limitesUso = {
        tipo: tipoLimite,
        usado,
        limite,
        disponible: limite - usado,
        porcentajeUsado: Math.round((usado / limite) * 100)
      };
      
      next();
      
    } catch (error) {
      console.error(`Error en checkSaaSLimits (${tipoLimite}):`, error);
      return res.status(500).json({
        error: 'Error verificando límites del plan',
        code: 'CHECK_LIMITS_ERROR'
      });
    }
  };
};

/**
 * Middleware: trackStorageUsage
 * Actualiza el contador de almacenamiento usado después de subir archivos
 */
const trackStorageUsage = async (req, res, next) => {
  // Guardar la función original de json
  const originalJson = res.json;
  
  res.json = function(data) {
    // Restaurar función original
    res.json = originalJson;
    
    // Si la respuesta es exitosa y hay archivos subidos
    if (res.statusCode < 400 && req.files && req.empresa) {
      // Calcular tamaño total de archivos subidos
      let bytesAgregados = 0;
      
      if (Array.isArray(req.files)) {
        bytesAgregados = req.files.reduce((total, file) => total + file.size, 0);
      } else if (req.file) {
        bytesAgregados = req.file.size;
      }
      
      if (bytesAgregados > 0) {
        const gbAgregados = bytesAgregados / (1024 * 1024 * 1024);
        
        // Actualizar en background (no bloquear respuesta)
        Empresa.findByIdAndUpdate(
          req.empresa._id,
          { $inc: { 'configuracionPlan.usadoGB': gbAgregados } }
        ).catch(err => console.error('Error actualizando uso de almacenamiento:', err));
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware: requirePlanFeature
 * Verifica que el plan tenga una característica específica habilitada
 * Ejemplo: multimedia, gps, exportExcel, etc.
 */
const requirePlanFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const empresa = req.empresa;
      
      if (!empresa) {
        return res.status(500).json({
          error: 'Información de empresa no disponible',
          code: 'EMPRESA_DATA_MISSING'
        });
      }
      
      // Obtener detalles del plan
      const Plan = require('../models/Plan');
      const plan = await Plan.findById(empresa.configuracionPlan.planId);
      
      if (!plan) {
        return res.status(500).json({
          error: 'Plan no encontrado',
          code: 'PLAN_NOT_FOUND'
        });
      }
      
      // Verificar si la característica existe y está habilitada
      const featureEnabled = plan.caracteristicas?.[featureName];
      
      if (!featureEnabled) {
        return res.status(403).json({
          error: `Esta función requiere un plan superior. Característica: ${featureName}`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName,
          upgradeRequired: true,
          planesDisponibles: await Plan.find({ 
            [`caracteristicas.${featureName}`]: true,
            isPublic: true 
          }).select('nombre precioMensual')
        });
      }
      
      next();
      
    } catch (error) {
      console.error(`Error en requirePlanFeature (${featureName}):`, error);
      return res.status(500).json({
        error: 'Error verificando características del plan',
        code: 'CHECK_FEATURE_ERROR'
      });
    }
  };
};

/**
 * Middleware: checkDemoExpiration
 * Alerta cuando el período demo está por expirar o ya expiró
 */
const checkDemoExpiration = async (req, res, next) => {
  try {
    const empresa = req.empresa;
    
    if (!empresa || empresa.status !== 'demo') {
      return next();
    }
    
    const diasRestantes = empresa.diasRestantes();
    
    // Agregar header informativo si quedan pocos días
    if (diasRestantes <= 7 && diasRestantes > 0) {
      res.set('X-Demo-Expiration-Warning', `${diasRestantes} days remaining`);
    }
    
    if (diasRestantes <= 0) {
      return res.status(403).json({
        error: 'Período de demo expirado. Por favor contrate un plan.',
        status: 'demo_expired',
        code: 'DEMO_EXPIRED',
        accionRequerida: 'seleccionar_plan',
        redirectTo: '/planes'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Error en checkDemoExpiration:', error);
    next(); // No bloquear por errores aquí
  }
};

/**
 * Middleware: getUsageStats
 * Agrega estadísticas de uso al request (para mostrar en UI)
 */
const getUsageStats = async (req, res, next) => {
  try {
    const empresa = req.empresa;
    
    if (!empresa) {
      return next();
    }
    
    const plan = empresa.configuracionPlan;
    const Plan = require('../models/Plan');
    const Grupo = require('../models/Grupo');
    
    const [planDetails, usuariosCount, formulariosCount, gruposCount] = await Promise.all([
      Plan.findById(plan.planId),
      User.countDocuments({ empresaId: empresa._id, isActive: { $ne: false } }),
      Formulario.countDocuments({ empresaId: empresa._id, isDeleted: { $ne: true } }),
      Grupo.countDocuments({ empresaId: empresa._id, isDeleted: false })
    ]);
    
    req.usageStats = {
      usuarios: {
        usado: usuariosCount,
        limite: plan.limiteUsuarios,
        porcentaje: Math.round((usuariosCount / plan.limiteUsuarios) * 100)
      },
      formularios: {
        usado: formulariosCount,
        limite: plan.limiteFormularios,
        porcentaje: Math.round((formulariosCount / plan.limiteFormularios) * 100)
      },
      almacenamiento: {
        usado: plan.usadoGB.toFixed(2),
        limite: plan.almacenamientoMaxGB,
        porcentaje: Math.round((plan.usadoGB / plan.almacenamientoMaxGB) * 100)
      },
      grupos: {
        usado: gruposCount,
        limite: planDetails?.caracteristicas?.maxGrupos || 3,
        porcentaje: Math.round((gruposCount / (planDetails?.caracteristicas?.maxGrupos || 3)) * 100)
      },
      plan: {
        nombre: planDetails?.nombre || 'Desconocido',
        status: empresa.status,
        diasRestantes: empresa.diasRestantes(),
        fechaVencimiento: plan.fechaVencimiento
      }
    };
    
    next();
    
  } catch (error) {
    console.error('Error en getUsageStats:', error);
    next();
  }
};

module.exports = {
  checkEnterpriseStatus,
  checkSaaSLimits,
  trackStorageUsage,
  requirePlanFeature,
  checkDemoExpiration,
  getUsageStats
};
