const express = require('express');
const router = express.Router();
const { xacThucKhachHang } = require('../middleware/auth');
const {
  xemDanhGiaSanPham,
  guiDanhGiaSanPham,
  danhSachNhanVienDeDanhGia,
  guiDanhGiaNhanVien,
} = require('../controllers/reviewController');

// Công khai - ai cũng xem được điểm trung bình
router.get('/san-pham/:id', xemDanhGiaSanPham);
router.get('/nhan-vien', danhSachNhanVienDeDanhGia);

// Yêu cầu đăng nhập khách hàng mới được gửi đánh giá
router.post('/san-pham', xacThucKhachHang, guiDanhGiaSanPham);
router.post('/nhan-vien', xacThucKhachHang, guiDanhGiaNhanVien);

module.exports = router;
