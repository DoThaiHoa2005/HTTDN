const multer = require('multer');
const path = require('path');
const fs = require('fs');

const thuMucLuu = path.join(__dirname, '../../uploads/san-pham');
fs.mkdirSync(thuMucLuu, { recursive: true });

const luuTru = multer.diskStorage({
  destination: (req, file, cb) => cb(null, thuMucLuu),
  filename: (req, file, cb) => {
    const duoiFile = path.extname(file.originalname);
    const tenFileMoi = `${Date.now()}-${Math.round(Math.random() * 1e9)}${duoiFile}`;
    cb(null, tenFileMoi);
  },
});

const CAC_LOAI_ANH_HOP_LE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function locFile(req, file, cb) {
  if (!CAC_LOAI_ANH_HOP_LE.includes(file.mimetype)) {
    return cb(new Error('Chỉ chấp nhận file ảnh định dạng JPG, PNG, WEBP hoặc GIF'));
  }
  cb(null, true);
}

const upload = multer({
  storage: luuTru,
  fileFilter: locFile,
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB mỗi ảnh
});

module.exports = { upload };
