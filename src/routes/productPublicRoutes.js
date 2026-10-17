const express = require('express');
const router = express.Router();
const {
  danhSachSanPhamCongKhai,
  danhSachDanhMucCongKhai,
  chiTietSanPhamCongKhai,
} = require('../controllers/productPublicController');

router.get('/', danhSachSanPhamCongKhai);
router.get('/danh-muc', danhSachDanhMucCongKhai);
router.get('/:id', chiTietSanPhamCongKhai);

module.exports = router;
