// controllers/formController.js - Controlador de Formularios (Contrato v1.0)
const Formulario = require('../models/Formulario');
const Respuesta = require('../models/Respuesta');
const User = require('../models/User');
const Empresa = require('../models/Empresa');
const fs = require('fs');
const path = require('path');

// POST /api/formularios - Crear formulario
exports.crearFormulario = async (req, res) => {
  try {
    const { titulo, descripcion, campos, esPlantilla, categoria } = req.body;

    // Validaciones
    if (!titulo || titulo.trim().length === 0) {
      return res.status(400).json({
        error: "El título del formulario es requerido",
        code: "TITULO_REQUERIDO"
      });
    }

    if (!campos || !Array.isArray(campos) || campos.length === 0) {
      return res.status(400).json({
        error: "Los campos del formulario son requeridos",
        code: "CAMPOS_REQUERIDOS"
      });
    }

    // Validar cada campo según tipo
    const camposValidados = campos.map(campo => {
      // Generar ID si no tiene
      if (!campo.id) {
        campo.id = `campo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Validaciones específicas por tipo
      switch (campo.tipo) {
        case 'cuadricula_unica':
        case 'cuadricula_multiple':
          if (!campo.filas || campo.filas.length === 0) campo.filas = ["Fila 1"];
          if (!campo.columnas || campo.columnas.length === 0) campo.columnas = ["Columna 1"];
          break;
        case 'radio':
        case 'multiple':
        case 'dropdown':
          if (!campo.opciones || campo.opciones.length === 0) {
            campo.opciones = ["Opción 1"];
          }
          break;
        case 'escala':
          if (!campo.escalaConfig) {
            campo.escalaConfig = { min: 1, max: 5, etiquetaMin: '', etiquetaMax: '' };
          }
          break;
      }
      return campo;
    });

    const nuevoForm = new Formulario({
      titulo: titulo.trim(),
      descripcion: descripcion || '',
      campos: camposValidados,
      empresaId: req.user.empresaId,
      creadoPor: req.user._id,
      esPlantilla: esPlantilla || false,
      categoria: esPlantilla ? categoria : null
    });

    await nuevoForm.save();

    // Incrementar contador de formularios de la empresa
    const empresa = req.empresa;
    if (empresa) {
      await empresa.incrementarContador('formularios');
    }

    res.status(201).json({
      exito: true,
      mensaje: "Formulario creado exitosamente",
      data: nuevoForm
    });
  } catch (error) {
    console.error("❌ Error en crearFormulario:", error);
    res.status(500).json({
      error: "Error al crear el formulario",
      code: "SERVER_ERROR",
      detalle: error.message
    });
  }
};


// GET /api/formularios - Listar formularios
exports.obtenerFormularios = async (req, res) => {
  try {
    const { activo, esPlantilla } = req.query;
    const empresaId = req.user.empresaId;

    // Construir filtro
    const filtro = { empresaId };
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (esPlantilla !== undefined) filtro.esPlantilla = esPlantilla === 'true';

    // SuperAdmin puede ver todos los formularios
    if (req.user.rol === 'superadmin' && req.query.todos === 'true') {
      delete filtro.empresaId;
    }

    const formularios = await Formulario.find(filtro)
      .populate('creadoPor', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      exito: true,
      count: formularios.length,
      data: formularios
    });
  } catch (error) {
    console.error("Error en obtenerFormularios:", error);
    res.status(500).json({
      error: "Error al obtener formularios",
      code: "SERVER_ERROR"
    });
  }
};

// GET /api/formularios/:id - Obtener formulario por ID
exports.obtenerFormularioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;

    const filtro = { _id: id };
    // Si no es superadmin, filtrar por empresa
    if (req.user.rol !== 'superadmin') {
      filtro.empresaId = empresaId;
    }

    const formulario = await Formulario.findOne(filtro)
      .populate('creadoPor', 'nombre email');

    if (!formulario) {
      return res.status(404).json({
        error: "Formulario no encontrado",
        code: "FORMULARIO_NOT_FOUND"
      });
    }

    res.json({
      exito: true,
      data: formulario
    });
  } catch (error) {
    console.error("Error en obtenerFormularioPorId:", error);
    res.status(500).json({
      error: "Error al obtener formulario",
      code: "SERVER_ERROR"
    });
  }
};

// PUT /api/formularios/:id - Actualizar formulario
exports.actualizarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, campos, activo, esPlantilla, categoria } = req.body;
    const empresaId = req.user.empresaId;

    const formulario = await Formulario.findOne({ _id: id, empresaId });
    if (!formulario) {
      return res.status(404).json({
        error: "Formulario no encontrado",
        code: "FORMULARIO_NOT_FOUND"
      });
    }

    // Actualizar campos
    if (titulo) formulario.titulo = titulo.trim();
    if (descripcion !== undefined) formulario.descripcion = descripcion;
    if (campos) {
      formulario.campos = campos;
      formulario.markModified('campos');
    }
    if (activo !== undefined) formulario.activo = activo;
    if (esPlantilla !== undefined) formulario.esPlantilla = esPlantilla;
    if (categoria !== undefined) formulario.categoria = categoria;

    await formulario.save();

    res.json({
      exito: true,
      mensaje: "Formulario actualizado exitosamente",
      data: formulario
    });
  } catch (error) {
    console.error("Error en actualizarFormulario:", error);
    res.status(500).json({
      error: "Error al actualizar formulario",
      code: "SERVER_ERROR",
      detalle: error.message
    });
  }
};

// DELETE /api/formularios/:id - Eliminar formulario
exports.eliminarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;

    const formulario = await Formulario.findOne({ _id: id, empresaId });
    if (!formulario) {
      return res.status(404).json({
        error: "Formulario no encontrado",
        code: "FORMULARIO_NOT_FOUND"
      });
    }

    // Soft delete: marcar como inactivo en lugar de eliminar
    formulario.activo = false;
    await formulario.save();
    // await formulario.deleteOne(); // Para eliminación permanente

    res.json({
      exito: true,
      mensaje: "Formulario eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en eliminarFormulario:", error);
    res.status(500).json({
      error: "Error al eliminar formulario",
      code: "SERVER_ERROR"
    });
  }
};

// PATCH /api/formularios/:id/activar - Toggle estado activo
exports.toggleActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.user.empresaId;

    const formulario = await Formulario.findOne({ _id: id, empresaId });
    if (!formulario) {
      return res.status(404).json({
        error: "Formulario no encontrado",
        code: "FORMULARIO_NOT_FOUND"
      });
    }

    formulario.activo = !formulario.activo;
    await formulario.save();

    res.json({
      exito: true,
      mensaje: `Formulario ${formulario.activo ? 'activado' : 'desactivado'}`,
      data: { activo: formulario.activo }
    });
  } catch (error) {
    console.error("Error en toggleActivo:", error);
    res.status(500).json({
      error: "Error cambiando estado del formulario",
      code: "SERVER_ERROR"
    });
  }
};

// Métodos de respuestas movidos a respuestaController.js

// Métodos de listar respuestas movidos a respuestaController.js