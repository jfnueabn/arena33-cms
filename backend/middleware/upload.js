const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // SVG is deliberately excluded: it can carry scripts.
    const ok = /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype) && /\.(png|jpe?g|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PNG, JPG, WEBP or GIF images up to 2 MB'), ok);
  }
});

module.exports = upload;
