// routes/backoffice.js (Ampliación)

// 1. Ver todas las empresas y sus gerentes
router.get('/empresas', [auth, esBackoffice], async (req, res) => {
    try {
        // Buscamos todos los usuarios con rol gerente
        const gerentes = await User.find({ rol: 'gerente' }).select('-password');
        res.json(gerentes);
    } catch (err) {
        res.status(500).send('Error al obtener empresas');
    }
});

// 2. Ver TODOS los reportes de todas las empresas (Visión Global)
router.get('/reportes-globales', [auth, esBackoffice], async (req, res) => {
    try {
        const reportes = await Respuesta.find()
            .populate('usuarioId', 'nombre email empresaId')
            .populate('formularioId', 'titulo')
            .sort({ fechaEnvio: -1 });
        res.json(reportes);
    } catch (err) {
        res.status(500).send('Error al obtener reportes globales');
    }
});

// 3. Crear Formulario en el Marketplace (Plantilla)
router.post('/market/subir', [auth, esBackoffice], async (req, res) => {
    try {
        const nuevaPlantilla = new Formulario({
            ...req.body,
            empresaId: 'SISTEMA', // Marcamos que es del sistema, no de una empresa
            esPlantilla: true     // Flag para que aparezca en la tienda
        });
        await nuevaPlantilla.save();
        res.json({ msg: 'Plantilla publicada en la tienda' });
    } catch (err) {
        res.status(500).send('Error al subir al market');
    }
});