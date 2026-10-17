// Dùng sau xacThucQuanLy - req.quanLy đã được gắn sẵn
// Chặn tài khoản vai_tro = 'nhan_vien' truy cập vào khu vực Admin
// (sản phẩm, quản lý tài khoản) - đúng yêu cầu "giao diện Admin tách biệt"
function chiAdmin(req, res, next) {
  if (!req.quanLy || req.quanLy.vai_tro !== 'admin') {
    return res.status(403).json({ message: 'Chỉ tài khoản admin mới có quyền truy cập mục này' });
  }
  next();
}

module.exports = { chiAdmin };
