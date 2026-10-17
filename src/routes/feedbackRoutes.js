const express = require('express');
const router = express.Router();
const { xacThucKhachHang } = require('../middleware/auth');
const {
  guiPhanHoi,
  xemPhanHoiCuaToi,
} = require('../controllers/feedbackController');

router.post('/', xacThucKhachHang, guiPhanHoi);
router.get('/cua-toi', xacThucKhachHang, xemPhanHoiCuaToi);

module.exports = router;
