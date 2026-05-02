// controllers/brandingController.js - Controlador de Branding (Contrato v1.0)
const Empresa = require('../models/Empresa');

// GET /api/empresa/branding
exports.getBranding = async (req, res) => {
  try {
    const empresa = req.empresa;

    if (!empresa) {
      return res.status(404).json({
        error: 'Empresa no encontrada',
        code: 'EMPRESA_NOT_FOUND'
      });
    }

    res.json({
      exito: true,
      data: {
        nombreApp: empresa.branding.nombreApp,
        logoUrl: empresa.branding.logoUrl,
        colorPrimario: empresa.branding.colorPrimario,
        colorSecundario: empresa.branding.colorSecundario,
        favicon: empresa.branding.favicon
      }
    });
  } catch (error) {
    console.error('Error en getBranding:', error);
    res.status(500).json({
      error: 'Error obteniendo branding',
      code: 'SERVER_ERROR'
    });
  }
};

// PUT /api/empresa/branding
exports.updateBranding = async (req, res) => {
  try {
    const { nombreApp, colorPrimario, colorSecundario } = req.body;
    const empresa = req.empresa;

    if (!empresa) {
      return res.status(404).json({
        error: 'Empresa no encontrada',
        code: 'EMPRESA_NOT_FOUND'
      });
    }

    // Validar colores hexadecimales
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (colorPrimario && !hexRegex.test(colorPrimario)) {
      return res.status(400).json({
        error: 'colorPrimario debe ser un color hexadecimal válido (ej: #3B82F6)',
        code: 'INVALID_COLOR'
      });
    }

    if (colorSecundario && !hexRegex.test(colorSecundario)) {
      return res.status(400).json({
        error: 'colorSecundario debe ser un color hexadecimal válido (ej: #1E293B)',
        code: 'INVALID_COLOR'
      });
    }

    // Actualizar campos
    if (nombreApp !== undefined) empresa.branding.nombreApp = nombreApp;
    if (colorPrimario !== undefined) empresa.branding.colorPrimario = colorPrimario;
    if (colorSecundario !== undefined) empresa.branding.colorSecundario = colorSecundario;

    await empresa.save();

    res.json({
      exito: true,
      mensaje: 'Branding actualizado exitosamente',
      data: {
        nombreApp: empresa.branding.nombreApp,
        colorPrimario: empresa.branding.colorPrimario,
        colorSecundario: empresa.branding.colorSecundario
      }
    });
  } catch (error) {
    console.error('Error en updateBranding:', error);
    res.status(500).json({
      error: 'Error actualizando branding',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};

// POST /api/empresa/logo
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se proporcionó ningún archivo',
        code: 'NO_FILE'
      });
    }

    const empresa = req.empresa;
    
    if (!empresa) {
      return res.status(404).json({
        error: 'Empresa no encontrada',
        code: 'EMPRESA_NOT_FOUND'
      });
    }

    // Obtener ruta relativa del archivo
    const logoUrl = req.file.path.replace(/\\/g, '/');

    // Actualizar logo
    empresa.branding.logoUrl = logoUrl;
    await empresa.save();

    res.json({
      exito: true,
      mensaje: 'Logo subido exitosamente',
      logoUrl,
      data: {
        logoUrl: empresa.branding.logoUrl
      }
    });
  } catch (error) {
    console.error('Error en uploadLogo:', error);
    res.status(500).json({
      error: 'Error subiendo logo',
      code: 'SERVER_ERROR',
      detalle: error.message
    });
  }
};
