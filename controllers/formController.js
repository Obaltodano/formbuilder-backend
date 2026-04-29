const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta');
const Usuario = require('../models/User');
const fs = require('fs');
const path = require('path');

exports.crearFormulario = async (req, res) => {
    try {
        const { titulo, campos } = req.body;

        // Validar que el usuario tenga empresaId
        if (!req.user?.empresaId) {
            return res.status(400).json({ msg: "Usuario no tiene empresa asignada" });
        }

        // Validación de datos de entrada
        if (!titulo || titulo.trim().length === 0) {
            return res.status(400).json({ msg: "El título del formulario es requerido" });
        }

        if (!campos || !Array.isArray(campos) || campos.length === 0) {
            return res.status(400).json({ msg: "Los campos del formulario son requeridos" });
        }

        // Validación preventiva para cuadrículas
        const camposValidados = campos.map(campo => {
            if (campo.tipo && campo.tipo.startsWith('cuadricula')) {
                if (!campo.filas || campo.filas.length === 0) {
                    campo.filas = ["Fila 1"]; 
                }
                if (!campo.columnas || campo.columnas.length === 0) {
                    campo.columnas = ["Columna 1"];
                }
            }
            return campo;
        });

        const nuevoForm = new Formulario({
            titulo: titulo.trim(),
            campos: camposValidados,
            empresaId: req.user.empresaId,
            creadoPor: req.user.id || req.user._id
        });

        await nuevoForm.save();
        res.status(201).json({ msg: "Formulario guardado con éxito", data: nuevoForm });
    } catch (error) {
        console.error("Error en crearFormulario:", error);
        res.status(500).json({ msg: "Error al guardar el formulario" });
    }
};


exports.obtenerFormulariosPorEmpresa = async (req, res) => {
    try {
        // Solo traemos los formularios que pertenecen a la empresa del usuario
        const formularios = await Formulario.find({ empresaId: req.user.empresaId });
        res.json(formularios);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener formularios" });
    }
};

// 1. Obtener un formulario específico por ID (Para que Pedro lo vea)
exports.obtenerFormularioPorId = async (req, res) => {
    try {
        const formulario = await Formulario.findOne({ 
            _id: req.params.id, 
            empresaId: req.user.empresaId 
        });
        if (!formulario) return res.status(404).json({ msg: "No encontrado" });
        res.json(formulario);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener el detalle" });
    }
};

// 2. Guardar la respuesta del empleado
exports.guardarRespuesta = async (req, res) => {
  try {
    // 1. Obtener datos básicos
    const { empresaId, formularioId } = req.body;
    const usuarioId = req.user ? (req.user.id || req.user._id) : req.body.usuarioId;
    const nombreUsuario = req.user ? req.user.nombre : "Usuario_Desconocido";
    const nombreFormulario = req.body.nombreFormulario || "Formulario_General"; // Asegúrate de enviarlo desde el front

    const datosRecibidos = JSON.parse(req.body.datos);
    
    // Clonar datos para evitar mutación del objeto original
    const datosFinales = { ...datosRecibidos };

    // 2. Definir y crear la ruta física de la carpeta
    // Estructura: uploads/NOMBRE_EMPRESA/NOMBRE_USUARIO/NOMBRE_FORMULARIO
    const carpetaDestino = path.join(
      'uploads', 
      empresaId.replace(/\s+/g, '_'), 
      nombreUsuario.replace(/\s+/g, '_'), 
      nombreFormulario.replace(/\s+/g, '_')
    );

    // Crear la carpeta si no existe (recursive: true crea toda la ruta)
    if (!fs.existsSync(carpetaDestino)) {
      fs.mkdirSync(carpetaDestino, { recursive: true });
    }

    // 3. Procesar los archivos recibidos
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Generar nombre de archivo único
        const nombreArchivo = `${Date.now()}-${file.originalname}`;
        const rutaFisicaFinal = path.join(carpetaDestino, nombreArchivo);

        // MOVER el archivo de la carpeta temporal a la carpeta estructurada
        fs.renameSync(file.path, rutaFisicaFinal);

        // Guardar la ruta relativa en el objeto de datos para la BD
        const rutaRelativa = rutaFisicaFinal.replace(/\\/g, '/');
        const campoLabel = file.fieldname; // Ahora es el label del campo

        if (campoLabel) {
          if (!datosFinales[campoLabel] || typeof datosFinales[campoLabel] === 'string') {
            datosFinales[campoLabel] = [];
          }
          datosFinales[campoLabel].push(rutaRelativa);
        }
      });
    }

    // 4. Guardar en MongoDB
    const nuevaRespuesta = new Respuesta({
      usuarioId,
      formularioId,
      empresaId,
      datos: datosRecibidos,
      fechaEnvio: new Date()
    });

    await nuevaRespuesta.save();
    res.status(201).json({ mensaje: 'Reporte y archivos guardados correctamente' });

  } catch (error) {
    console.error("ERROR AL GUARDAR:", error);
    res.status(500).json({ error: 'Error físico al guardar archivos', detalle: error.message });
  }
};

//3. Obtener reportes (respuestas) para el gerente
exports.listarRespuestas = async (req, res) => {
    try {
        const respuestas = await Respuesta.find({ empresaId: req.user.empresaId })
            // Asegúrate de que 'Usuario' coincida exactamente con mongoose.model('Usuario', ...)
            .populate({
                path: 'usuarioId',
                select: 'nombre',
                model: 'User' // Forzamos el uso del modelo registrado
            })
            .populate('formularioId') 
            .sort({ fechaEnvio: -1 })
            .lean();

        // Filtro para evitar errores si se borró un usuario o formulario
        const respuestasValidas = respuestas.filter(r => r.usuarioId && r.formularioId);

        console.log(`[Backend] Enviando ${respuestasValidas.length} reportes.`);
        res.json(respuestasValidas);
    } catch (error) {
        console.error("❌ Error en listarRespuestas:", error.message);
        res.status(500).json({ error: "Error al cargar los reportes" });
    }
};