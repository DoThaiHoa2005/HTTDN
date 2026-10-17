const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Kiểm tra token JWT trong header Authorization: Bearer <token>
// Sau đó đối chiếu lại với CSDL để khóa tài khoản / xóa tài khoản có hiệu lực NGAY,
// không phải chờ token hết hạn. Nếu hợp lệ, gắn thông tin vào req.khachHang.
async function xacThucKhachHang(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
  }

  if (payload.loai !== 'khach_hang') {
    return res.status(403).json({ message: 'Token không có quyền truy cập mục này' });
  }

  try {
    const [[kh]] = await pool.query('SELECT id, sdt, trang_thai FROM khachhang WHERE id = ?', [payload.id]);
    if (!kh) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    }
    if (kh.trang_thai === 'khoa') {
      return res.status(401).json({ message: 'Tài khoản đã bị khóa, vui lòng liên hệ quán để được hỗ trợ' });
    }
    req.khachHang = { id: kh.id, sdt: kh.sdt, loai: 'khach_hang' };
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xác thực' });
  }
}

module.exports = { xacThucKhachHang };
