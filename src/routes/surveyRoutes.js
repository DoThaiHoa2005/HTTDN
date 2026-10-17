const express = require('express');
const router = express.Router();
const { xacThucKhachHang } = require('../middleware/auth');
const {
  layKhaoSatDangHoatDong,
  nopTraLoiKhaoSat,
} = require('../controllers/surveyController');

router.get('/dang-hoat-dong', xacThucKhachHang, layKhaoSatDangHoatDong);
router.post('/tra-loi', xacThucKhachHang, nopTraLoiKhaoSat);

module.exports = router;
