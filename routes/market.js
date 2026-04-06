const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Formulario = require('../models/Formulario'); 
// O puedes crear un modelo específico llamado 'MarketItem'

// Obtener todos los formularios disponibles en la tienda
router.get('/templates', auth, async (req, res) => {
    try {
        // Buscamos formularios que no pertenecen a ninguna empresa específica (globales)
        const templates = await Formulario.find({ esPlantilla: true });
        res.json(templates);
    } catch (err) {
        res.status(500).send('Error al cargar la tienda');
    }
});

// Clonar formulario del Market a la Empresa
router.post('/instalar/:id', auth, async (req, res) => {
    try {
        const plantilla = await Formulario.findById(req.params.id);
        
        // Creamos una COPIA exacta pero con el empresaId del gerente actual
        const nuevoForm = new Formulario({
            titulo: plantilla.titulo,
            campos: plantilla.campos,
            empresaId: req.user.empresaId, // El ID de la empresa que lo descarga
            esPlantilla: false 
        });

        await nuevoForm.save();
        res.json({ msg: 'Formulario instalado en tu panel' });
    } catch (err) {
        res.status(500).send('Error al instalar');
    }
});

module.exports = router;