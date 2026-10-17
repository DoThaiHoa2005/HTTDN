const express = require('express');
const router = express.Router();
const { xacThucKhachHang } = require('../middleware/auth');
const {
  dangKy,
  dangNhap,
  layThongTin,
  suaThongTin,
  doiMatKhau,
} = require('../controllers/authController');

router.post('/dang-ky', dangKy);
router.post('/dang-nhap', dangNhap);
router.get('/thong-tin', xacThucKhachHang, layThongTin);
router.put('/thong-tin', xacThucKhachHang, suaThongTin);
router.put('/doi-mat-khau', xacThucKhachHang, doiMatKhau);

module.exports = router;
