const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Kiểm tra token JWT của quản lý, tách biệt hoàn toàn với token khách hàng.
// Vai trò được đọc lại từ CSDL ở mỗi request => đổi quyền/xóa tài khoản có hiệu lực ngay.
async function xacThucQuanLy(req, res, next) {
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

  if (payload.loai !== 'quan_ly') {
    return res.status(403).json({ message: 'Token không có quyền truy cập mục này' });
  }

  try {
    const [[ql]] = await pool.query(
      'SELECT id, ten_dang_nhap, vai_tro FROM quanly WHERE id = ?',
      [payload.id]
    );
    if (!ql) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    }
    req.quanLy = { id: ql.id, ten_dang_nhap: ql.ten_dang_nhap, vai_tro: ql.vai_tro, loai: 'quan_ly' };
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xác thực' });
  }
}

module.exports = { xacThucQuanLy };
