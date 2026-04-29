// controllers/adminController.js - Controlador SuperAdmin para SaaS
const Empresa = require('../models/Empresa');
const Plan = require('../models/Plan');
const Pago = require('../models/Pago');
const User = require('../models/User');
const Cupon = require('../models/Cupon');
const mongoose = require('mongoose');

/**
 * GET /api/admin/metrics
 * Dashboard metrics para SuperAdmin
 * MRR, Total empresas, uso de almacenamiento global
 */
exports.getMetrics = async (req, res) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1);
    
    // Pipeline de agregación para métricas
    const [metricasGenerales, ingresosPorMes, empresasPorPlan, empresasPorStatus, almacenamientoGlobal] = await Promise.all([
      // Métricas generales
      Empresa.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalEmpresas: { $sum: 1 },
            empresasActivas: {
              $sum: { $cond: [{ $eq: ['$status', 'activo'] }, 1, 0] }
            },
            empresasDemo: {
              $sum: { $cond: [{ $eq: ['$status', 'demo'] }, 1, 0] }
            },
            empresasSuspendidas: {
              $sum: { $cond: [{ $eq: ['$status', 'suspendido'] }, 1, 0] }
            },
            empresasPendiente: {
              $sum: { $cond: [{ $eq: ['$status', 'pendiente_pago'] }, 1, 0] }
            },
            totalAlmacenamiento: { $sum: '$configuracionPlan.usadoGB' }
          }
        }
      ]),
      
      // Ingresos por mes (últimos 12 meses)
      Pago.aggregate([
        {
          $match: {
            status: 'aprobado',
            fechaAprobacion: { $gte: new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$fechaAprobacion' },
              month: { $month: '$fechaAprobacion' }
            },
            total: { $sum: '$monto' },
            cantidad: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
      ]),
      
      // Empresas por plan
      Empresa.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: 'plans',
            localField: 'configuracionPlan.planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        { $unwind: '$plan' },
        {
          $group: {
            _id: '$plan.nombre',
            cantidad: { $sum: 1 },
            ingresosMensuales: { $sum: '$plan.precioMensual' }
          }
        }
      ]),
      
      // Empresas por status
      Empresa.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$status',
            cantidad: { $sum: 1 }
          }
        }
      ]),
      
      // Almacenamiento global
      Empresa.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalUsado: { $sum: '$configuracionPlan.usadoGB' },
            promedioPorEmpresa: { $avg: '$configuracionPlan.usadoGB' },
            maxUsado: { $max: '$configuracionPlan.usadoGB' }
          }
        }
      ])
    ]);
    
    // Calcular MRR (Monthly Recurring Revenue)
    const mrr = await Pago.aggregate([
      {
        $match: {
          status: 'aprobado',
          fechaAprobacion: { $gte: inicioMes }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);
    
    // Calcular ARR (Annual Recurring Revenue)
    const arr = await Pago.aggregate([
      {
        $match: {
          status: 'aprobado',
          fechaAprobacion: { $gte: inicioAnio }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);
    
    // Pagos pendientes de revisión
    const pagosPendientes = await Pago.countDocuments({ status: 'pendiente' });
    
    // Cupones activos
    const cuponesActivos = await Cupon.countDocuments({ 
      isActive: true,
      fechaExpiracion: { $gt: ahora }
    });
    
    // Total de usuarios en la plataforma
    const totalUsuarios = await User.countDocuments({
      isActive: { $ne: false }
    });
    
    // Formatear respuesta
    const metricas = metricasGenerales[0] || {
      totalEmpresas: 0,
      empresasActivas: 0,
      empresasDemo: 0,
      empresasSuspendidas: 0,
      empresasPendiente: 0,
      totalAlmacenamiento: 0
    };
    
    res.json({
      exito: true,
      data: {
        resumen: {
          totalEmpresas: metricas.totalEmpresas,
          empresasActivas: metricas.empresasActivas,
          empresasDemo: metricas.empresasDemo,
          empresasSuspendidas: metricas.empresasSuspendidas,
          empresasPendiente: metricas.empresasPendiente,
          totalUsuarios,
          pagosPendientesRevision: pagosPendientes,
          cuponesActivos
        },
        finanzas: {
          mrr: mrr[0]?.total || 0,
          arr: arr[0]?.total || 0,
          moneda: 'MXN'
        },
        almacenamiento: {
          totalGlobalGB: almacenamientoGlobal[0]?.totalUsado?.toFixed(2) || 0,
          promedioPorEmpresaGB: almacenamientoGlobal[0]?.promedioPorEmpresa?.toFixed(2) || 0,
          maxPorEmpresaGB: almacenamientoGlobal[0]?.maxUsado?.toFixed(2) || 0
        },
        distribucion: {
          porPlan: empresasPorPlan,
          porStatus: empresasPorStatus.reduce((acc, curr) => {
            acc[curr._id] = curr.cantidad;
            return acc;
          }, {}),
          ingresosMensuales: ingresosPorMes
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getMetrics:', error);
    res.status(500).json({
      error: 'Error obteniendo métricas',
      detalle: error.message
    });
  }
};

/**
 * GET /api/admin/empresas
 * Listar todas las empresas con filtros
 */
exports.getEmpresas = async (req, res) => {
  try {
    const { 
      status, 
      planId, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'fechaRegistro',
      sortOrder = 'desc'
    } = req.query;
    
    // Construir filtro
    const filtro = { isDeleted: false };
    
    if (status) filtro.status = status;
    if (planId) filtro['configuracionPlan.planId'] = planId;
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'contacto.emailFacturacion': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const [empresas, total] = await Promise.all([
      Empresa.find(filtro)
        .populate('configuracionPlan.planId', 'nombre precioMensual')
        .populate('creadoPor', 'nombre email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Empresa.countDocuments(filtro)
    ]);
    
    res.json({
      exito: true,
      data: empresas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error en getEmpresas:', error);
    res.status(500).json({
      error: 'Error obteniendo empresas',
      detalle: error.message
    });
  }
};

/**
 * PATCH /api/admin/empresas/:id/suspender
 * Suspender una empresa
 */
exports.suspenderEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const empresa = await Empresa.findByIdAndUpdate(
      id,
      {
        status: 'suspendido',
        motivoSuspension: motivo || 'Suspendida por administrador'
      },
      { new: true }
    );
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    res.json({
      exito: true,
      mensaje: 'Empresa suspendida exitosamente',
      data: empresa
    });
    
  } catch (error) {
    console.error('Error en suspenderEmpresa:', error);
    res.status(500).json({
      error: 'Error suspendiendo empresa',
      detalle: error.message
    });
  }
};

/**
 * PATCH /api/admin/empresas/:id/activar
 * Activar/reactivar una empresa
 */
exports.activarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.findByIdAndUpdate(
      id,
      {
        status: 'activo',
        motivoSuspension: null
      },
      { new: true }
    );
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    res.json({
      exito: true,
      mensaje: 'Empresa activada exitosamente',
      data: empresa
    });
    
  } catch (error) {
    console.error('Error en activarEmpresa:', error);
    res.status(500).json({
      error: 'Error activando empresa',
      detalle: error.message
    });
  }
};

/**
 * POST /api/admin/planes
 * Crear un nuevo plan
 */
exports.crearPlan = async (req, res) => {
  try {
    const {
      nombre,
      slug,
      descripcion,
      precioMensual,
      precioAnual,
      caracteristicas,
      isPublic,
      isDestacado,
      orden
    } = req.body;
    
    // Validar slug único
    const planExistente = await Plan.findOne({ slug });
    if (planExistente) {
      return res.status(409).json({
        error: 'Ya existe un plan con ese slug'
      });
    }
    
    const plan = new Plan({
      nombre,
      slug,
      descripcion,
      precioMensual,
      precioAnual,
      caracteristicas,
      isPublic: isPublic !== undefined ? isPublic : true,
      isDestacado: isDestacado || false,
      orden: orden || 0
    });
    
    await plan.save();
    
    res.status(201).json({
      exito: true,
      mensaje: 'Plan creado exitosamente',
      data: plan
    });
    
  } catch (error) {
    console.error('Error en crearPlan:', error);
    res.status(500).json({
      error: 'Error creando plan',
      detalle: error.message
    });
  }
};

/**
 * PUT /api/admin/planes/:id
 * Actualizar un plan existente
 */
exports.actualizarPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Si se actualiza el slug, verificar que no exista otro
    if (updateData.slug) {
      const existente = await Plan.findOne({
        slug: updateData.slug,
        _id: { $ne: id }
      });
      if (existente) {
        return res.status(409).json({
          error: 'Ya existe otro plan con ese slug'
        });
      }
    }
    
    const plan = await Plan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    res.json({
      exito: true,
      mensaje: 'Plan actualizado exitosamente',
      data: plan
    });
    
  } catch (error) {
    console.error('Error en actualizarPlan:', error);
    res.status(500).json({
      error: 'Error actualizando plan',
      detalle: error.message
    });
  }
};

/**
 * GET /api/admin/pagos
 * Listar todos los pagos con filtros
 */
exports.getPagos = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filtro = {};
    if (status) filtro.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [pagos, total] = await Promise.all([
      Pago.find(filtro)
        .populate('empresaId', 'nombre slug contacto.emailFacturacion')
        .populate('planId', 'nombre')
        .populate('revisadoPor', 'nombre email')
        .sort({ fechaPeticion: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Pago.countDocuments(filtro)
    ]);
    
    res.json({
      exito: true,
      data: pagos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error en getPagos:', error);
    res.status(500).json({
      error: 'Error obteniendo pagos',
      detalle: error.message
    });
  }
};

/**
 * PATCH /api/admin/pagos/:id/aprobar
 * Aprobar un pago y extender vigencia de la empresa
 */
exports.aprobarPago = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { notas } = req.body;
    const adminId = req.user.id;
    
    // Buscar el pago
    const pago = await Pago.findById(id).session(session);
    
    if (!pago) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    if (pago.status === 'aprobado') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Este pago ya fue aprobado' });
    }
    
    // Buscar la empresa
    const empresa = await Empresa.findById(pago.empresaId).session(session);
    
    if (!empresa) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    // Calcular nueva fecha de vencimiento
    const ahora = new Date();
    let mesesAgregados = pago.periodo.meses || (pago.periodo.tipo === 'anual' ? 12 : 1);
    
    // Si el plan aún no venció, agregar desde la fecha actual de vencimiento
    let fechaBase = empresa.configuracionPlan.fechaVencimiento > ahora 
      ? empresa.configuracionPlan.fechaVencimiento 
      : ahora;
    
    const nuevaFechaVencimiento = new Date(fechaBase);
    nuevaFechaVencimiento.setMonth(nuevaFechaVencimiento.getMonth() + mesesAgregados);
    
    // Actualizar empresa
    empresa.configuracionPlan.fechaVencimiento = nuevaFechaVencimiento;
    empresa.status = 'activo';
    empresa.motivoSuspension = null;
    
    await empresa.save({ session });
    
    // Actualizar pago
    pago.status = 'aprobado';
    pago.revisadoPor = adminId;
    pago.fechaAprobacion = ahora;
    pago.fechaRevision = ahora;
    pago.notasAdmin = notas || null;
    pago.vigencia = {
      fechaInicio: fechaBase,
      fechaFin: nuevaFechaVencimiento
    };
    
    await pago.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      exito: true,
      mensaje: 'Pago aprobado exitosamente',
      data: {
        pago,
        empresaActualizada: {
          id: empresa._id,
          nuevoStatus: empresa.status,
          fechaVencimiento: nuevaFechaVencimiento,
          diasAgregados: mesesAgregados * 30
        }
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error en aprobarPago:', error);
    res.status(500).json({
      error: 'Error aprobando pago',
      detalle: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * PATCH /api/admin/pagos/:id/rechazar
 * Rechazar un pago
 */
exports.rechazarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { razon } = req.body;
    const adminId = req.user.id;
    
    if (!razon) {
      return res.status(400).json({
        error: 'Debe proporcionar una razón para rechazar'
      });
    }
    
    const pago = await Pago.findByIdAndUpdate(
      id,
      {
        status: 'rechazado',
        revisadoPor: adminId,
        fechaRevision: new Date(),
        notasAdmin: razon
      },
      { new: true }
    );
    
    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    res.json({
      exito: true,
      mensaje: 'Pago rechazado',
      data: pago
    });
    
  } catch (error) {
    console.error('Error en rechazarPago:', error);
    res.status(500).json({
      error: 'Error rechazando pago',
      detalle: error.message
    });
  }
};

/**
 * POST /api/admin/cupones
 * Crear un nuevo cupón
 */
exports.crearCupon = async (req, res) => {
  try {
    const {
      codigo,
      tipo,
      descuento,
      usosMaximos,
      usosMaximosPorEmpresa,
      fechaExpiracion,
      montoMinimo,
      planesAplicables
    } = req.body;
    
    // Validar código único
    const existente = await Cupon.findOne({ codigo: codigo.toUpperCase() });
    if (existente) {
      return res.status(409).json({
        error: 'Ya existe un cupón con ese código'
      });
    }
    
    const cupon = new Cupon({
      codigo: codigo.toUpperCase(),
      tipo,
      descuento,
      usosMaximos: usosMaximos || 100,
      usosMaximosPorEmpresa: usosMaximosPorEmpresa || 1,
      fechaExpiracion: new Date(fechaExpiracion),
      montoMinimo: montoMinimo || 0,
      planesAplicables: planesAplicables || [],
      creadoPor: req.user.id
    });
    
    await cupon.save();
    
    res.status(201).json({
      exito: true,
      mensaje: 'Cupón creado exitosamente',
      data: cupon
    });
    
  } catch (error) {
    console.error('Error en crearCupon:', error);
    res.status(500).json({
      error: 'Error creando cupón',
      detalle: error.message
    });
  }
};
