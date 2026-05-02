// controllers/respuestaController.js - Controlador de Respuestas (Contrato v1.0)
const Respuesta = require('../models/Respuesta');
const Formulario = require('../models/Formulario');
const Empresa = require('../models/Empresa');
const fs = require('fs');
const path = require('path');

// Helper: Generar nombre de archivo único
const generarNombreArchivo = (campoId, originalName) => {
  const timestamp = Date.now();
  const extension = path.extname(originalName);
  return `${campoId}_${timestamp}${extension}`;
};

// POST /api/respuestas - Crear respuesta con archivos (CRÍTICO: Contrato v1.0)
exports.crearRespuesta = async (req, res) => {
  try {
    // 1. Extraer metadatos del FormData
    const { empresaId, formularioId, datos } = req.body;
    const usuarioId = req.user._id;

    console.log('📥 Creando respuesta:', { empresaId, formularioId, usuarioId });

    // Validaciones
    if (!empresaId || !formularioId || !datos) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: empresaId, formularioId, datos',
        code: 'MISSING_FIELDS'
      });
    }

    // 2. Parsear datos JSON
    let datosParseados;
    try {
      datosParseados = typeof datos === 'string' ? JSON.parse(datos) : datos;
    } catch (e) {
      return res.status(400).json({
        error: 'El campo "datos" debe ser un JSON válido',
        code: 'INVALID_JSON'
      });
    }

    // 3. Verificar que el formulario existe y pertenece a la empresa
    const formulario = await Formulario.findOne({
      _id: formularioId,
      empresaId,
      activo: true
    });

    if (!formulario) {
      return res.status(404).json({
        error: 'Formulario no encontrado o inactivo',
        code: 'FORMULARIO_NOT_FOUND'
      });
    }

    // 4. Procesar archivos (si existen)
    const archivosProcesados = [];
    const datosFinales = { ...datosParseados };

    if (req.files && req.files.length > 0) {
      // Crear directorio para la empresa
      const dirBase = path.join('uploads', empresaId, 'respuestas');
      if (!fs.existsSync(dirBase)) {
        fs.mkdirSync(dirBase, { recursive: true });
      }

      // Procesar cada archivo
      req.files.forEach(file => {
        const campoId = file.fieldname;
        const nombreArchivo = generarNombreArchivo(campoId, file.originalname);
        const rutaFinal = path.join(dirBase, nombreArchivo);

        // Mover archivo
        fs.renameSync(file.path, rutaFinal);

        // Ruta relativa para BD
        const rutaRelativa = rutaFinal.replace(/\\/g, '/');

        // Determinar tipo de archivo
        let tipoArchivo = 'adjunto';
        if (file.mimetype.startsWith('image/')) tipoArchivo = 'foto';
        else if (file.mimetype.startsWith('video/')) tipoArchivo = 'video';

        // Guardar en array de archivos
        archivosProcesados.push({
          campoId,
          path: rutaRelativa,
          tipo: tipoArchivo,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });

        // Actualizar datos: asignar ruta al campo correspondiente
        datosFinales[campoId] = rutaRelativa;

        console.log(`✅ Archivo procesado: ${campoId} -> ${rutaRelativa}`);
      });
    }

    // 5. Crear respuesta en BD
    const nuevaRespuesta = new Respuesta({
      formularioId,
      empresaId,
      usuarioId,
      datos: datosFinales,
      archivos: archivosProcesados,
      fechaEnvio: new Date()
    });

    await nuevaRespuesta.save();

    // 6. Incrementar contador de respuestas de la empresa
    const empresa = await Empresa.findByEmpresaId(empresaId);
    if (empresa) {
      await empresa.incrementarContador('respuestas');
      // Calcular storage usado por archivos
      const storageUsado = archivosProcesados.reduce((total, arch) => total + arch.size, 0);
      if (storageUsado > 0) {
        await empresa.incrementarContador('storage', Math.ceil(storageUsado / (1024 * 1024))); // Convertir a MB
      }
    }

    console.log('✅ Respuesta creada:', nuevaRespuesta._id);

    res.status(201).json({
      exito: true,
      mensaje: 'Respuesta enviada exitosamente',
      data: {
        _id: nuevaRespuesta._id,
        formularioId: nuevaRespuesta.formularioId,
        fechaEnvio: nuevaRespuesta.fechaEnvio,
        archivosSubidos: archivosProcesados.length
      }
    });

  } catch (error) {
    console.error('❌ Error en crearRespuesta:', error);
    res.status(500).json({
      error: 'Error al guardar la respuesta',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};

// GET /api/respuestas - Listar respuestas
exports.listarRespuestas = async (req, res) => {
  try {
    const { formularioId, empresaId } = req.query;
    const userEmpresaId = req.user.empresaId;

    // Construir filtro
    const filtro = {};

    // Si no es superadmin, solo ver respuestas de su empresa
    if (req.user.rol !== 'superadmin') {
      filtro.empresaId = userEmpresaId;
    } else if (empresaId) {
      filtro.empresaId = empresaId;
    }

    if (formularioId) filtro.formularioId = formularioId;

    const respuestas = await Respuesta.find(filtro)
      .populate('usuarioId', 'nombre email fotoUrl')
      .populate('formularioId', 'titulo')
      .sort({ fechaEnvio: -1 });

    res.json({
      exito: true,
      count: respuestas.length,
      data: respuestas
    });
  } catch (error) {
    console.error('Error en listarRespuestas:', error);
    res.status(500).json({
      error: 'Error al obtener respuestas',
      code: 'SERVER_ERROR'
    });
  }
};

// GET /api/respuestas/:id - Obtener respuesta específica
exports.obtenerRespuesta = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;

    const filtro = { _id: id };
    if (req.user.rol !== 'superadmin') {
      filtro.empresaId = empresaId;
    }

    const respuesta = await Respuesta.findOne(filtro)
      .populate('usuarioId', 'nombre email fotoUrl')
      .populate('formularioId');

    if (!respuesta) {
      return res.status(404).json({
        error: 'Respuesta no encontrada',
        code: 'RESPUESTA_NOT_FOUND'
      });
    }

    res.json({
      exito: true,
      data: respuesta
    });
  } catch (error) {
    console.error('Error en obtenerRespuesta:', error);
    res.status(500).json({
      error: 'Error al obtener respuesta',
      code: 'SERVER_ERROR'
    });
  }
};

// DELETE /api/respuestas/:id - Eliminar respuesta
exports.eliminarRespuesta = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;
    const rol = req.user.rol;

    const filtro = { _id: id, empresaId };

    const respuesta = await Respuesta.findOne(filtro);
    if (!respuesta) {
      return res.status(404).json({
        error: 'Respuesta no encontrada',
        code: 'RESPUESTA_NOT_FOUND'
      });
    }

    // Solo gerente, superadmin o el creador pueden eliminar
    const puedeEliminar = rol === 'superadmin' ||
                         rol === 'gerente' ||
                         respuesta.usuarioId.toString() === req.user._id.toString();

    if (!puedeEliminar) {
      return res.status(403).json({
        error: 'No tienes permiso para eliminar esta respuesta',
        code: 'ACCESS_DENIED'
      });
    }

    // Eliminar archivos físicos
    if (respuesta.archivos && respuesta.archivos.length > 0) {
      respuesta.archivos.forEach(archivo => {
        try {
          if (fs.existsSync(archivo.path)) {
            fs.unlinkSync(archivo.path);
          }
        } catch (e) {
          console.warn('No se pudo eliminar archivo:', archivo.path);
        }
      });
    }

    await respuesta.deleteOne();

    res.json({
      exito: true,
      mensaje: 'Respuesta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error en eliminarRespuesta:', error);
    res.status(500).json({
      error: 'Error al eliminar respuesta',
      code: 'SERVER_ERROR'
    });
  }
};
