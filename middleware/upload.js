const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // La carpeta que ya tienes creada
  },
  filename: (req, file, cb) => {
    // Le ponemos un nombre único: FECHA.extension (sin depender de req.user)
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`);
  }
});

module.exports = multer({ storage });