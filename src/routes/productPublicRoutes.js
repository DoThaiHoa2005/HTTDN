const express = require('express');
const { kiemTraIdThamSo } = require('../utils/kiemTra');
const router = express.Router();
const {
  danhSachSanPhamCongKhai,
  danhSachDanhMucCongKhai,
  chiTietSanPhamCongKhai,
} = require('../controllers/productPublicController');

router.param('id', kiemTraIdThamSo); // mọi :id phải là số nguyên dương

router.get('/', danhSachSanPhamCongKhai);
router.get('/danh-muc', danhSachDanhMucCongKhai);
router.get('/:id', chiTietSanPhamCongKhai);

module.exports = router;
