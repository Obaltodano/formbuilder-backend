const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta');

exports.crearFormulario = async (req, res) => {
    try {
        const { titulo, campos } = req.body;
        
        const nuevoForm = new Formulario({
            titulo,
            campos,
            empresaId: req.user.empresaId // Extraído del token por el middleware
        });
          console.log(nuevoForm)
        await nuevoForm.save();
        res.status(201).json({ msg: "Formulario guardado con éxito", data: nuevoForm });
    } catch (error) {
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
    // 1. Parsear los datos de texto
    const datosRecibidos = JSON.parse(req.body.datos); 
    
    // 2. Manejar MÚLTIPLES ARCHIVOS (CORREGIDO PARA RUTAS RELATIVAS)
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Normalizamos la ruta (Windows \ a URL /)
        const rutaCompleta = file.path.replace(/\\/g, '/');

        // BUSCAMOS EL ÍNDICE DE 'uploads' PARA RECORTAR LA RUTA
        // Esto transforma "C:/Users/.../backend/uploads/img.png" en "uploads/img.png"
        const indiceUploads = rutaCompleta.indexOf('uploads/');
        const rutaRelativa = rutaCompleta.substring(indiceUploads);

        // Si el campo en tu formulario se llama 'fotosUrl', lo guardamos ahí
        if (!datosRecibidos.fotosUrl) {
          datosRecibidos.fotosUrl = [];
        }
        datosRecibidos.fotosUrl.push(rutaRelativa);
        
        // OPCIONAL: Si quieres que el valor del campo específico del formulario
        // (por ejemplo el que tiene el ID largo) también sea la ruta:
        // Buscamos si existe la llave en datosRecibidos que coincida con el nombre del input
        // pero lo más seguro es usar el array fotosUrl que creamos arriba.
      });
    }

    // 3. Crear el documento en la BD
    const nuevaRespuesta = new Respuesta({
      usuarioId: req.user ? (req.user.id || req.user._id) : req.body.usuarioId,
      formularioId: req.body.formularioId,
      empresaId: req.body.empresaId,
      datos: datosRecibidos, // Aquí ya van las rutas relativas
      fechaEnvio: new Date()
    });

    if (!nuevaRespuesta.usuarioId) {
      return res.status(401).json({ 
        error: 'No se pudo identificar al usuario.' 
      });
    }

    await nuevaRespuesta.save();
    
    res.status(201).json({ 
      mensaje: 'Reporte guardado con éxito',
      id: nuevaRespuesta._id 
    });

  } catch (error) {
    console.error("ERROR EN CONTROLADOR:", error);
    res.status(500).json({ 
      error: 'Error interno al guardar',
      detalle: error.message 
    });
  }
};

//3. Obtener reportes (respuestas) para el gerente
exports.listarRespuestas = async (req, res) => {
    try {
        // Buscamos respuestas filtradas por la empresa del token
        const respuestas = await Respuesta.find({ empresaId: req.user.empresaId })
            .populate('usuarioId', 'nombre') 
            .populate('formularioId', 'titulo')
            .sort({ fechaEnvio: -1 })
            .lean(); // .lean() hace la consulta más ligera y evita errores de punteros

        // FILTRO CRÍTICO: Si borraste un usuario o un formulario, populate devuelve null.
        // Esto evita que el Frontend explote al intentar leer datos de un null.
        const respuestasLimpias = respuestas.filter(r => r.usuarioId && r.formularioId);

        console.log(`[Backend] Enviando ${respuestasLimpias.length} reportes válidos.`);
        res.json(respuestasLimpias);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN LISTAR RESPUESTAS:", error.message);
        res.status(500).json({ msg: "Error al procesar reportes", error: error.message });
    }
};