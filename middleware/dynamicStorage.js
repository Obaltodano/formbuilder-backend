// middleware/dynamicStorage.js - Configuración dinámica de Multer para SaaS
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Empresa = require('../models/Empresa');

/**
 * Asegura que el directorio exista, lo crea si no
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Genera nombre de archivo único y seguro
 */
const generateSafeFilename = (originalname) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = path.extname(originalname).toLowerCase();
  const safeName = `${timestamp}-${random}${extension}`;
  return safeName;
};

/**
 * Limpia un string para usarlo como nombre de carpeta
 */
const sanitizeFolderName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
};

/**
 * Configuración de almacenamiento dinámico para diferentes tipos de archivos
 */
const createDynamicStorage = (tipoDestino) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // Obtener empresaId del usuario autenticado
        const empresaId = req.user?.empresaId;
        
        if (!empresaId) {
          return cb(new Error('No se encontró la empresa del usuario'), null);
        }
        
        // Buscar información de la empresa para el nombre
        let empresaNombre = 'default';
        try {
          const empresa = await Empresa.findById(empresaId).select('slug');
          if (empresa) {
            empresaNombre = empresa.slug || empresaId.toString();
          }
        } catch (err) {
          console.error('Error obteniendo empresa:', err);
        }
        
        let basePath = 'uploads';
        let finalPath;
        
        switch (tipoDestino) {
          case 'logos':
            // uploads/{empresaId}/logos/
            finalPath = path.join(basePath, empresaId.toString(), 'logos');
            break;
            
          case 'comprobantes':
            // uploads/{empresaId}/comprobantes/
            finalPath = path.join(basePath, empresaId.toString(), 'comprobantes');
            break;
            
          case 'formularios':
            // uploads/{empresaId}/formularios/{formId}/
            const formId = req.params.formId || req.body.formularioId || 'general';
            finalPath = path.join(basePath, empresaId.toString(), 'formularios', formId.toString());
            break;
            
          case 'perfiles':
            // uploads/{empresaId}/perfiles/{userId}/
            const userId = req.user?.id || 'unknown';
            finalPath = path.join(basePath, empresaId.toString(), 'perfiles', userId.toString());
            break;
            
          case 'documentos':
            // uploads/{empresaId}/documentos/
            finalPath = path.join(basePath, empresaId.toString(), 'documentos');
            break;
            
          case 'exports':
            // uploads/{empresaId}/exports/
            finalPath = path.join(basePath, empresaId.toString(), 'exports');
            break;
            
          default:
            finalPath = path.join(basePath, empresaId.toString(), 'misc');
        }
        
        // Asegurar que el directorio exista
        ensureDirectoryExists(finalPath);
        
        cb(null, finalPath);
        
      } catch (error) {
        console.error('Error en destination:', error);
        cb(error, null);
      }
    },
    
    filename: (req, file, cb) => {
      // Generar nombre seguro
      const safeName = generateSafeFilename(file.originalname);
      cb(null, safeName);
    }
  });
};

/**
 * Filtros de archivos según tipo
 */
const fileFilters = {
  // Solo imágenes para logos y fotos
  imagenes: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP, SVG)'), false);
    }
  },
  
  // Imágenes y videos para formularios
  multimedia: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y videos (MP4, WebM)'), false);
    }
  },
  
  // Documentos para comprobantes
  documentos: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/pdf',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes, PDFs o documentos Word'), false);
    }
  },
  
  // Todos los tipos permitidos
  todos: (req, file, cb) => {
    cb(null, true);
  }
};

/**
 * Límites de tamaño según tipo
 */
const sizeLimits = {
  logo: 5 * 1024 * 1024,        // 5 MB para logos
  comprobante: 10 * 1024 * 1024, // 10 MB para comprobantes
  formulario: 50 * 1024 * 1024,  // 50 MB por archivo de formulario
  perfil: 5 * 1024 * 1024,       // 5 MB para fotos de perfil
  export: 100 * 1024 * 1024      // 100 MB para exports
};

/**
 * Factory function para crear middlewares de upload configurados
 */
const createUploadMiddleware = (tipoDestino, fileFilter = 'todos', maxFileSize = null) => {
  const storage = createDynamicStorage(tipoDestino);
  const filter = fileFilters[fileFilter] || fileFilters.todos;
  
  let limit = maxFileSize;
  if (!limit) {
    switch (tipoDestino) {
      case 'logos':
      case 'perfiles':
        limit = sizeLimits.logo;
        break;
      case 'comprobantes':
        limit = sizeLimits.comprobante;
        break;
      case 'formularios':
        limit = sizeLimits.formulario;
        break;
      case 'exports':
        limit = sizeLimits.export;
        break;
      default:
        limit = 10 * 1024 * 1024; // 10 MB default
    }
  }
  
  return multer({
    storage,
    fileFilter: filter,
    limits: {
      fileSize: limit,
      files: 10 // Máximo 10 archivos por upload
    }
  });
};

// Middlewares preconfigurados
const uploadLogo = createUploadMiddleware('logos', 'imagenes', sizeLimits.logo);
const uploadComprobante = createUploadMiddleware('comprobantes', 'documentos', sizeLimits.comprobante);
const uploadFormularioFiles = createUploadMiddleware('formularios', 'multimedia', sizeLimits.formulario);
const uploadPerfil = createUploadMiddleware('perfiles', 'imagenes', sizeLimits.perfil);
const uploadExport = createUploadMiddleware('exports', 'todos', sizeLimits.export);

/**
 * Middleware para manejar errores de Multer
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errores específicos de Multer
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'Archivo demasiado grande',
          code: 'FILE_TOO_LARGE',
          maxSize: err.field ? `${Math.round(sizeLimits[err.field] / (1024*1024))} MB` : 'ver documentación'
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(413).json({
          error: 'Demasiados archivos',
          code: 'TOO_MANY_FILES',
          maxFiles: 10
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: `Campo de archivo no esperado: ${err.field}`,
          code: 'UNEXPECTED_FIELD'
        });
        
      default:
        return res.status(400).json({
          error: 'Error al procesar archivo',
          code: err.code,
          message: err.message
        });
    }
  }
  
  // Errores de tipo de archivo
  if (err.message && err.message.includes('Solo se permiten')) {
    return res.status(415).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  // Otros errores
  if (err) {
    console.error('Error en upload:', err);
    return res.status(500).json({
      error: 'Error interno al procesar archivos',
      code: 'UPLOAD_ERROR'
    });
  }
  
  next();
};

/**
 * Middleware para obtener rutas relativas de archivos subidos
 * y agregarlas al request
 */
const extractUploadedFiles = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }
  
  // Convertir a array si es objeto (multiple fields)
  let files = [];
  
  if (req.file) {
    files = [req.file];
  } else if (Array.isArray(req.files)) {
    files = req.files;
  } else if (typeof req.files === 'object') {
    // Multer fields -> flatten
    Object.values(req.files).forEach(fieldFiles => {
      if (Array.isArray(fieldFiles)) {
        files.push(...fieldFiles);
      }
    });
  }
  
  // Extraer rutas relativas
  req.uploadedFilePaths = files.map(file => {
    // Convertir path absoluto a relativo desde uploads/
    const relativePath = file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      filename: file.filename,
      path: relativePath,
      size: file.size,
      mimetype: file.mimetype
    };
  });
  
  // Calcular tamaño total
  req.totalUploadSize = files.reduce((total, file) => total + file.size, 0);
  
  next();
};

module.exports = {
  uploadLogo,
  uploadComprobante,
  uploadFormularioFiles,
  uploadPerfil,
  uploadExport,
  createUploadMiddleware,
  handleMulterError,
  extractUploadedFiles,
  createDynamicStorage,
  generateSafeFilename,
  sanitizeFolderName
};
