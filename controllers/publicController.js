// controllers/publicController.js - Controlador público para marketplace
const Plan = require('../models/Plan');
const Cupon = require('../models/Cupon');
const Empresa = require('../models/Empresa');

/**
 * GET /api/public/planes
 * Listar planes públicos para el marketplace/landing
 */
exports.getPlanesPublicos = async (req, res) => {
  try {
    const planes = await Plan.find({ 
      isPublic: true, 
      isActive: true 
    })
    .select('-createdAt -updatedAt -__v')
    .sort({ orden: 1, precioMensual: 1 });
    
    // Formatear respuesta para el frontend
    const planesFormateados = planes.map(plan => ({
      id: plan._id,
      nombre: plan.nombre,
      slug: plan.slug,
      descripcion: plan.descripcion,
      precio: {
        mensual: plan.precioMensual,
        anual: plan.precioAnual,
        descuentoAnual: plan.descuentoAnual
      },
      caracteristicas: plan.caracteristicas,
      destacado: plan.isDestacado
    }));
    
    res.json({
      exito: true,
      data: planesFormateados
    });
    
  } catch (error) {
    console.error('Error en getPlanesPublicos:', error);
    res.status(500).json({
      error: 'Error obteniendo planes',
      detalle: error.message
    });
  }
};

/**
 * GET /api/public/planes/:slug
 * Obtener detalle de un plan específico
 */
exports.getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const plan = await Plan.findOne({ 
      slug,
      isPublic: true,
      isActive: true 
    }).select('-createdAt -updatedAt -__v');
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    // Obtener planes similares (comparables en precio)
    const planesSimilares = await Plan.find({
      _id: { $ne: plan._id },
      isPublic: true,
      isActive: true,
      precioMensual: {
        $gte: plan.precioMensual * 0.5,
        $lte: plan.precioMensual * 2
      }
    })
    .select('nombre slug precioMensual precioAnual caracteristicas.maxUsuarios')
    .limit(3);
    
    res.json({
      exito: true,
      data: {
        plan: {
          id: plan._id,
          nombre: plan.nombre,
          slug: plan.slug,
          descripcion: plan.descripcion,
          precio: {
            mensual: plan.precioMensual,
            anual: plan.precioAnual,
            descuentoAnual: plan.descuentoAnual
          },
          caracteristicas: plan.caracteristicas,
          destacado: plan.isDestacado
        },
        comparacion: planesSimilares
      }
    });
    
  } catch (error) {
    console.error('Error en getPlanBySlug:', error);
    res.status(500).json({
      error: 'Error obteniendo plan',
      detalle: error.message
    });
  }
};

/**
 * POST /api/public/cupones/validar
 * Validar un código de cupón (público, para mostrar precio con descuento)
 */
exports.validarCupon = async (req, res) => {
  try {
    const { codigo, planId, monto } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ error: 'Código de cupón requerido' });
    }
    
    // Validar cupón
    const resultado = await Cupon.validarCodigo(codigo, null, planId, monto);
    
    if (!resultado.valido) {
      return res.status(400).json({
        exito: false,
        error: resultado.razon,
        code: 'CUPON_INVALIDO'
      });
    }
    
    res.json({
      exito: true,
      data: {
        codigo: resultado.cupon.codigo,
        tipo: resultado.cupon.tipo,
        descuento: resultado.cupon.descuento,
        descuentoCalculado: resultado.descuentoCalculado,
        precioFinal: monto - resultado.descuentoCalculado,
        fechaExpiracion: resultado.cupon.fechaExpiracion
      }
    });
    
  } catch (error) {
    console.error('Error en validarCupon:', error);
    res.status(500).json({
      error: 'Error validando cupón',
      detalle: error.message
    });
  }
};

/**
 * POST /api/public/registro
 * Registro público de nueva empresa (flujo de onboarding)
 */
exports.registrarEmpresa = async (req, res) => {
  try {
    const {
      // Datos de la empresa
      nombreEmpresa,
      emailFacturacion,
      telefono,
      
      // Datos del administrador/gerente
      nombreAdmin,
      emailAdmin,
      password,
      
      // Selección de plan
      planId,
      periodo, // 'mensual' o 'anual'
      
      // Cupón (opcional)
      cuponCodigo
    } = req.body;
    
    // Validaciones básicas
    if (!nombreEmpresa || !emailFacturacion || !nombreAdmin || !emailAdmin || !password || !planId) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }
    
    // Verificar que el plan existe
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isPublic || !plan.isActive) {
      return res.status(404).json({ error: 'Plan no encontrado o no disponible' });
    }
    
    // Verificar que no exista empresa con ese slug
    const slugBase = nombreEmpresa.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let slug = slugBase;
    let counter = 1;
    
    while (await Empresa.findOne({ slug })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }
    
    // Verificar que no exista usuario con ese email
    const User = require('../models/User');
    const usuarioExistente = await User.findOne({ email: emailAdmin.toLowerCase() });
    if (usuarioExistente) {
      return res.status(409).json({
        error: 'Ya existe un usuario con ese email'
      });
    }
    
    // Calcular fechas y precio
    const ahora = new Date();
    const meses = periodo === 'anual' ? 12 : 1;
    const fechaVencimiento = new Date(ahora);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + meses);
    
    const precioBase = periodo === 'anual' ? plan.precioAnual : plan.precioMensual;
    
    // Validar y aplicar cupón
    let cuponAplicado = null;
    let montoFinal = precioBase;
    
    if (cuponCodigo) {
      const validacionCupon = await Cupon.validarCodigo(cuponCodigo, null, planId, precioBase);
      
      if (validacionCupon.valido) {
        cuponAplicado = {
          codigo: validacionCupon.cupon.codigo,
          descuento: validacionCupon.cupon.descuento,
          tipo: validacionCupon.cupon.tipo
        };
        montoFinal = precioBase - validacionCupon.descuentoCalculado;
      }
    }
    
    // Crear empresa
    const empresa = new Empresa({
      nombre: nombreEmpresa,
      slug,
      logoUrl: null,
      status: 'pendiente_pago', // Requiere pago para activar
      configuracionPlan: {
        planId: plan._id,
        fechaInicio: ahora,
        fechaVencimiento,
        limiteUsuarios: plan.caracteristicas.maxUsuarios,
        limiteFormularios: plan.caracteristicas.maxFormularios,
        almacenamientoMaxGB: plan.caracteristicas.almacenamientoGB,
        usadoGB: 0
      },
      branding: {
        colorPrimario: '#007bff',
        logoLogin: null
      },
      contacto: {
        emailFacturacion: emailFacturacion.toLowerCase(),
        telefono
      }
    });
    
    await empresa.save();
    
    // Crear usuario administrador
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const usuario = new User({
      nombre: nombreAdmin,
      email: emailAdmin.toLowerCase(),
      password: hashedPassword,
      rol: 'gerente',
      empresaId: empresa._id,
      isActive: true
    });
    
    await usuario.save();
    
    // Asignar creadoPor
    empresa.creadoPor = usuario._id;
    await empresa.save();
    
    // Crear solicitud de pago
    const Pago = require('../models/Pago');
    const pago = new Pago({
      empresaId: empresa._id,
      planId: plan._id,
      monto: montoFinal,
      moneda: 'MXN',
      tipoPago: 'nueva_suscripcion',
      periodo: {
        tipo: periodo,
        meses: meses
      },
      cuponAplicado,
      metodoPago: 'transferencia',
      status: 'pendiente',
      fechaPeticion: ahora
    });
    
    await pago.save();
    
    // Si se usó cupón, registrar uso (sin empresaId aún, se actualizará al aprobar pago)
    if (cuponAplicado) {
      const cupon = await Cupon.findOne({ codigo: cuponAplicado.codigo });
      if (cupon) {
        cupon.usosActuales += 1;
        await cupon.save();
      }
    }
    
    res.status(201).json({
      exito: true,
      mensaje: 'Empresa registrada exitosamente',
      data: {
        empresa: {
          id: empresa._id,
          nombre: empresa.nombre,
          slug: empresa.slug,
          status: empresa.status
        },
        plan: {
          nombre: plan.nombre,
          precioOriginal: precioBase,
          precioFinal: montoFinal,
          descuentoAplicado: cuponAplicado ? (precioBase - montoFinal) : 0
        },
        pagoPendiente: {
          id: pago._id,
          monto: montoFinal,
          status: pago.status
        },
        nextSteps: [
          'Realizar el pago mediante transferencia bancaria',
          'Subir el comprobante en el portal',
          'Esperar aprobación del administrador'
        ]
      }
    });
    
  } catch (error) {
    console.error('Error en registrarEmpresa:', error);
    res.status(500).json({
      error: 'Error registrando empresa',
      detalle: error.message
    });
  }
};

/**
 * GET /api/public/estadisticas
 * Estadísticas públicas para marketing
 */
exports.getEstadisticasPublicas = async (req, res) => {
  try {
    const [totalEmpresas, empresasActivas, totalRespuestas] = await Promise.all([
      Empresa.countDocuments({ isDeleted: false }),
      Empresa.countDocuments({ status: 'activo', isDeleted: false }),
      require('../models/Respuesta').countDocuments()
    ]);
    
    res.json({
      exito: true,
      data: {
        empresasRegistradas: totalEmpresas,
        empresasActivas,
        totalRespuestasProcesadas: totalRespuestas,
        satisfaccion: 98 // Mock, reemplazar con datos reales
      }
    });
    
  } catch (error) {
    console.error('Error en getEstadisticasPublicas:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      detalle: error.message
    });
  }
};
