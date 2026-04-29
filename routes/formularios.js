const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const auth = require('../middleware/auth');
const Formulario = require('../models/Formulario');

// Ruta para crear formulario
router.post('/', auth, formController.crearFormulario);

// Ruta para obtener los formularios de la empresa
router.get('/', auth, formController.obtenerFormulariosPorEmpresa);

router.get('/:id', auth, formController.obtenerFormularioPorId);

// Actualizar un formulario existente
router.put('/:id', auth, async (req, res) => {
  try {
    const { titulo, campos } = req.body;
    
    // Usamos findById para tener el documento y poder modificarlo
    const formulario = await Formulario.findById(req.params.id);

    if (!formulario) return res.status(404).json({ msg: 'No encontrado' });
    if (formulario.empresaId.toString() !== req.user.empresaId.toString()) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    formulario.titulo = titulo;
    
    // Sobrescribimos el array de campos con el nuevo objeto que trae id y label
    formulario.campos = campos; 

    // MUY IMPORTANTE: Avisar a Mongoose que el contenido del array cambió
    formulario.markModified('campos');

    await formulario.save();
    res.json(formulario);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor');
  }
});

// Eliminar un formulario
router.delete('/:id', auth, async (req, res) => {
  try {
    const formulario = await Formulario.findById(req.params.id);

    if (!formulario) return res.status(404).json({ msg: 'No encontrado' });

    // CAMBIO AQUÍ TAMBIÉN: req.usuario
    if (formulario.empresaId.toString() !== req.user.empresaId.toString()) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    await formulario.deleteOne();
    res.json({ msg: 'Formulario eliminado' });
  } catch (err) {
    res.status(500).send('Error al eliminar');
  }
});

module.exports = router;