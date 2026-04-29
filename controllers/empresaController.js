// controllers/empresaController.js - Controlador para portal de empresas/gerentes
const Empresa = require('../models/Empresa');
const Plan = require('../models/Plan');
const Pago = require('../models/Pago');
const User = require('../models/User');
const Formulario = require('../models/Formulario');
const Grupo = require('../models/Grupo');
const Cupon = require('../models/Cupon');

/**
 * GET /api/empresa/usage
 * Ver contadores de uso de la empresa (usuarios, formularios, almacenamiento)
 */
exports.getUsage = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const empresa = req.empresa; // Middleware debe adjuntar esto
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    // Obtener conteos actuales
    const [usuariosCount, formulariosCount, gruposCount] = await Promise.all([
      User.countDocuments({ empresaId, isActive: { $ne: false } }),
      Formulario.countDocuments({ empresaId, isDeleted: { $ne: true } }),
      Grupo.countDocuments({ empresaId, isDeleted: false })
    ]);
    
    // Obtener detalles del plan
    const plan = await Plan.findById(empresa.configuracionPlan.planId);
    
    // Calcular porcentajes y disponibles
    const usage = {
      usuarios: {
        usado: usuariosCount,
        limite: empresa.configuracionPlan.limiteUsuarios,
        disponible: Math.max(0, empresa.configuracionPlan.limiteUsuarios - usuariosCount),
        porcentaje: Math.round((usuariosCount / empresa.configuracionPlan.limiteUsuarios) * 100),
        alerta: usuariosCount >= empresa.configuracionPlan.limiteUsuarios * 0.9
      },
      formularios: {
        usado: formulariosCount,
        limite: empresa.configuracionPlan.limiteFormularios,
        disponible: Math.max(0, empresa.configuracionPlan.limiteFormularios - formulariosCount),
        porcentaje: Math.round((formulariosCount / empresa.configuracionPlan.limiteFormularios) * 100),
        alerta: formulariosCount >= empresa.configuracionPlan.limiteFormularios * 0.9
      },
      almacenamiento: {
        usado: parseFloat(empresa.configuracionPlan.usadoGB.toFixed(2)),
        limite: empresa.configuracionPlan.almacenamientoMaxGB,
        disponible: parseFloat((empresa.configuracionPlan.almacenamientoMaxGB - empresa.configuracionPlan.usadoGB).toFixed(2)),
        porcentaje: Math.round((empresa.configuracionPlan.usadoGB / empresa.configuracionPlan.almacenamientoMaxGB) * 100),
        alerta: empresa.configuracionPlan.usadoGB >= empresa.configuracionPlan.almacenamientoMaxGB * 0.9
      },
      grupos: {
        usado: gruposCount,
        limite: plan?.caracteristicas?.maxGrupos || 3,
        disponible: Math.max(0, (plan?.caracteristicas?.maxGrupos || 3) - gruposCount),
        porcentaje: Math.round((gruposCount / (plan?.caracteristicas?.maxGrupos || 3)) * 100)
      }
    };
    
    // Información del plan actual
    const planInfo = {
      nombre: plan?.nombre || 'Desconocido',
      precioMensual: plan?.precioMensual || 0,
      precioAnual: plan?.precioAnual || 0,
      caracteristicas: plan?.caracteristicas || {}
    };
    
    // Estado de la suscripción
    const suscripcion = {
      status: empresa.status,
      fechaVencimiento: empresa.configuracionPlan.fechaVencimiento,
      diasRestantes: empresa.diasRestantes(),
      estaActiva: empresa.isPlanActive(),
      renovacionAutomatica: false // Por ahora manual
    };
    
    res.json({
      exito: true,
      data: {
        empresa: {
          nombre: empresa.nombre,
          slug: empresa.slug,
          logoUrl: empresa.logoUrl
        },
        usage,
        plan: planInfo,
        suscripcion,
        alertas: [
          ...(usage.usuarios.alerta ? ['⚠️ Estás cerca del límite de usuarios'] : []),
          ...(usage.formularios.alerta ? ['⚠️ Estás cerca del límite de formularios'] : []),
          ...(usage.almacenamiento.alerta ? ['⚠️ Estás cerca del límite de almacenamiento'] : []),
          ...(suscripcion.diasRestantes <= 7 ? [`⏰ Tu plan vence en ${suscripcion.diasRestantes} días`] : [])
        ]
      }
    });
    
  } catch (error) {
    console.error('Error en getUsage:', error);
    res.status(500).json({
      error: 'Error obteniendo uso de la empresa',
      detalle: error.message
    });
  }
};

/**
 * GET /api/empresa
 * Obtener información completa de la empresa
 */
exports.getEmpresaInfo = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    
    const empresa = await Empresa.findById(empresaId)
      .populate('configuracionPlan.planId', 'nombre caracteristicas')
      .select('-isDeleted -deletedAt');
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    res.json({
      exito: true,
      data: empresa
    });
    
  } catch (error) {
    console.error('Error en getEmpresaInfo:', error);
    res.status(500).json({
      error: 'Error obteniendo información de empresa',
      detalle: error.message
    });
  }
};

/**
 * PUT /api/empresa
 * Actualizar información de la empresa (branding, contacto)
 */
exports.updateEmpresa = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const { nombre, branding, contacto } = req.body;
    
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (branding) updateData.branding = branding;
    if (contacto) updateData.contacto = contacto;
    
    const empresa = await Empresa.findByIdAndUpdate(
      empresaId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    res.json({
      exito: true,
      mensaje: 'Empresa actualizada exitosamente',
      data: empresa
    });
    
  } catch (error) {
    console.error('Error en updateEmpresa:', error);
    res.status(500).json({
      error: 'Error actualizando empresa',
      detalle: error.message
    });
  }
};

/**
 * POST /api/empresa/pago
 * Enviar solicitud de pago con comprobante
 */
exports.solicitarPago = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    
    const {
      planId,
      periodo,
      monto,
      metodoPago,
      referenciaBancaria,
      notasSolicitante,
      cuponCodigo
    } = req.body;
    
    // Validar campos obligatorios
    if (!planId || !periodo || !monto) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: planId, periodo, monto'
      });
    }
    
    // Verificar que el plan existe
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    // Validar cupón si se proporcionó
    let cuponAplicado = null;
    let montoFinal = monto;
    
    if (cuponCodigo) {
      const validacionCupon = await Cupon.validarCodigo(
        cuponCodigo,
        empresaId,
        planId,
        monto
      );
      
      if (!validacionCupon.valido) {
        return res.status(400).json({
          error: validacionCupon.razon,
          code: 'CUPON_INVALIDO'
        });
      }
      
      cuponAplicado = {
        codigo: validacionCupon.cupon.codigo,
        descuento: validacionCupon.cupon.descuento,
        tipo: validacionCupon.cupon.tipo
      };
      
      montoFinal = monto - validacionCupon.descuentoCalculado;
    }
    
    // Verificar archivo de comprobante
    let comprobanteUrl = null;
    if (req.uploadedFilePaths && req.uploadedFilePaths.length > 0) {
      comprobanteUrl = req.uploadedFilePaths[0].path;
    } else if (req.file) {
      comprobanteUrl = req.file.path;
    }
    
    if (!comprobanteUrl && metodoPago !== 'tarjeta') {
      return res.status(400).json({
        error: 'Se requiere el comprobante de pago'
      });
    }
    
    // Crear solicitud de pago
    const pago = new Pago({
      empresaId,
      planId,
      monto: montoFinal,
      moneda: 'MXN',
      tipoPago: 'renovacion',
      periodo: {
        tipo: periodo,
        meses: periodo === 'anual' ? 12 : 1
      },
      cuponAplicado,
      metodoPago: metodoPago || 'transferencia',
      referenciaBancaria,
      comprobanteUrl,
      notasSolicitante,
      status: 'pendiente',
      fechaPeticion: new Date()
    });
    
    await pago.save();
    
    // Si se usó cupón, registrar el uso
    if (cuponAplicado) {
      const cupon = await Cupon.findOne({ codigo: cuponAplicado.codigo });
      if (cupon) {
        await cupon.usar(empresaId);
      }
    }
    
    res.status(201).json({
      exito: true,
      mensaje: 'Solicitud de pago enviada exitosamente',
      data: {
        pagoId: pago._id,
        status: pago.status,
        montoFinal,
        descuentoAplicado: cuponAplicado ? (monto - montoFinal) : 0,
        comprobanteUrl
      }
    });
    
  } catch (error) {
    console.error('Error en solicitarPago:', error);
    res.status(500).json({
      error: 'Error procesando solicitud de pago',
      detalle: error.message
    });
  }
};

/**
 * GET /api/empresa/pagos
 * Ver historial de pagos de la empresa
 */
exports.getHistorialPagos = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    
    const pagos = await Pago.find({ empresaId })
      .populate('planId', 'nombre')
      .populate('revisadoPor', 'nombre')
      .sort({ fechaPeticion: -1 });
    
    res.json({
      exito: true,
      data: pagos
    });
    
  } catch (error) {
    console.error('Error en getHistorialPagos:', error);
    res.status(500).json({
      error: 'Error obteniendo historial de pagos',
      detalle: error.message
    });
  }
};

/**
 * POST /api/empresa/upgrade
 * Solicitar upgrade/downgrade de plan
 */
exports.solicitarUpgrade = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const { nuevoPlanId } = req.body;
    
    const empresa = await Empresa.findById(empresaId);
    const planActual = await Plan.findById(empresa.configuracionPlan.planId);
    const nuevoPlan = await Plan.findById(nuevoPlanId);
    
    if (!nuevoPlan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    // Verificar si es upgrade o downgrade
    const esUpgrade = nuevoPlan.precioMensual > planActual.precioMensual;
    
    // Validar que no exceda límites actuales si es downgrade
    if (!esUpgrade) {
      const [usuariosCount, formulariosCount] = await Promise.all([
        User.countDocuments({ empresaId }),
        Formulario.countDocuments({ empresaId })
      ]);
      
      if (usuariosCount > nuevoPlan.caracteristicas.maxUsuarios) {
        return res.status(400).json({
          error: 'No puede cambiar a este plan. Tiene más usuarios que el límite permitido.',
          usuariosActuales: usuariosCount,
          limiteNuevo: nuevoPlan.caracteristicas.maxUsuarios
        });
      }
      
      if (formulariosCount > nuevoPlan.caracteristicas.maxFormularios) {
        return res.status(400).json({
          error: 'No puede cambiar a este plan. Tiene más formularios que el límite permitido.',
          formulariosActuales: formulariosCount,
          limiteNuevo: nuevoPlan.caracteristicas.maxFormularios
        });
      }
    }
    
    // Actualizar configuración
    empresa.configuracionPlan.planId = nuevoPlanId;
    empresa.configuracionPlan.limiteUsuarios = nuevoPlan.caracteristicas.maxUsuarios;
    empresa.configuracionPlan.limiteFormularios = nuevoPlan.caracteristicas.maxFormularios;
    empresa.configuracionPlan.almacenamientoMaxGB = nuevoPlan.caracteristicas.almacenamientoGB;
    
    await empresa.save();
    
    res.json({
      exito: true,
      mensaje: `Plan actualizado exitosamente a ${nuevoPlan.nombre}`,
      data: {
        planAnterior: planActual.nombre,
        planNuevo: nuevoPlan.nombre,
        tipoCambio: esUpgrade ? 'upgrade' : 'downgrade',
        nuevosLimites: {
          usuarios: nuevoPlan.caracteristicas.maxUsuarios,
          formularios: nuevoPlan.caracteristicas.maxFormularios,
          almacenamiento: nuevoPlan.caracteristicas.almacenamientoGB
        }
      }
    });
    
  } catch (error) {
    console.error('Error en solicitarUpgrade:', error);
    res.status(500).json({
      error: 'Error actualizando plan',
      detalle: error.message
    });
  }
};

// ==================== GRUPOS ====================

/**
 * POST /api/grupos
 * Crear un nuevo grupo
 */
exports.crearGrupo = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    
    const { nombre, descripcion, color, icono, usuariosIniciales } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    }
    
    // Verificar que los usuarios pertenezcan a la empresa
    if (usuariosIniciales && usuariosIniciales.length > 0) {
      const usuariosValidos = await User.find({
        _id: { $in: usuariosIniciales },
        empresaId
      });
      
      if (usuariosValidos.length !== usuariosIniciales.length) {
        return res.status(400).json({
          error: 'Algunos usuarios no pertenecen a esta empresa'
        });
      }
    }
    
    // Preparar array de usuarios
    const usuariosArray = (usuariosIniciales || []).map(uid => ({
      usuarioId: uid,
      rolEnGrupo: 'miembro',
      agregadoPor: userId
    }));
    
    const grupo = new Grupo({
      nombre,
      descripcion,
      empresaId,
      color: color || '#6c757d',
      icono: icono || 'users',
      usuarios: usuariosArray,
      formulariosAsignados: [],
      creadoPor: userId
    });
    
    await grupo.save();
    
    res.status(201).json({
      exito: true,
      mensaje: 'Grupo creado exitosamente',
      data: grupo
    });
    
  } catch (error) {
    console.error('Error en crearGrupo:', error);
    res.status(500).json({
      error: 'Error creando grupo',
      detalle: error.message
    });
  }
};

/**
 * GET /api/grupos
 * Listar grupos de la empresa
 */
exports.getGrupos = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    
    const grupos = await Grupo.findByEmpresa(empresaId);
    
    res.json({
      exito: true,
      data: grupos
    });
    
  } catch (error) {
    console.error('Error en getGrupos:', error);
    res.status(500).json({
      error: 'Error obteniendo grupos',
      detalle: error.message
    });
  }
};

/**
 * PATCH /api/grupos/:id/usuarios
 * Agregar usuario a un grupo
 */
exports.agregarUsuarioAGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;
    const userId = req.user.id;
    
    const grupo = await Grupo.findOne({
      _id: id,
      empresaId: req.user.empresaId
    });
    
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    // Verificar que el usuario existe y pertenece a la empresa
    const usuario = await User.findOne({
      _id: usuarioId,
      empresaId: req.user.empresaId
    });
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado o no pertenece a esta empresa'
      });
    }
    
    await grupo.agregarUsuario(usuarioId, userId);
    
    res.json({
      exito: true,
      mensaje: 'Usuario agregado al grupo exitosamente'
    });
    
  } catch (error) {
    console.error('Error en agregarUsuarioAGrupo:', error);
    res.status(500).json({
      error: error.message || 'Error agregando usuario al grupo'
    });
  }
};

/**
 * DELETE /api/grupos/:id/usuarios/:usuarioId
 * Remover usuario de un grupo
 */
exports.removerUsuarioDeGrupo = async (req, res) => {
  try {
    const { id, usuarioId } = req.params;
    
    const grupo = await Grupo.findOne({
      _id: id,
      empresaId: req.user.empresaId
    });
    
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    await grupo.removerUsuario(usuarioId);
    
    res.json({
      exito: true,
      mensaje: 'Usuario removido del grupo exitosamente'
    });
    
  } catch (error) {
    console.error('Error en removerUsuarioDeGrupo:', error);
    res.status(500).json({
      error: error.message || 'Error removiendo usuario del grupo'
    });
  }
};

/**
 * POST /api/grupos/:id/formularios
 * Asignar formulario a un grupo
 */
exports.asignarFormularioAGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { formularioId, fechaVencimiento } = req.body;
    const userId = req.user.id;
    
    const grupo = await Grupo.findOne({
      _id: id,
      empresaId: req.user.empresaId
    });
    
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    // Verificar que el formulario existe y pertenece a la empresa
    const formulario = await Formulario.findOne({
      _id: formularioId,
      empresaId: req.user.empresaId
    });
    
    if (!formulario) {
      return res.status(404).json({
        error: 'Formulario no encontrado o no pertenece a esta empresa'
      });
    }
    
    await grupo.asignarFormulario(formularioId, userId, fechaVencimiento);
    
    res.json({
      exito: true,
      mensaje: 'Formulario asignado al grupo exitosamente'
    });
    
  } catch (error) {
    console.error('Error en asignarFormularioAGrupo:', error);
    res.status(500).json({
      error: error.message || 'Error asignando formulario al grupo'
    });
  }
};
