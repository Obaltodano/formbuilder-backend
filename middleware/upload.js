const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // La carpeta que ya tienes creada
  },
  filename: (req, file, cb) => {
    // Le ponemos un nombre único: ID-FECHA.extension
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

module.exports = multer({ storage });