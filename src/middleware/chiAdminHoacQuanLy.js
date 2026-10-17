// Dùng sau xacThucQuanLy - cho phép vai_tro 'admin' hoặc 'quan_ly' đi tiếp
// Dùng cho các chức năng quản lý cấp trung (vd: tạo QR nhân viên)
// mà nhân viên thường (nhan_vien) không được phép truy cập
function chiAdminHoacQuanLy(req, res, next) {
  if (!req.quanLy || !['admin', 'quan_ly'].includes(req.quanLy.vai_tro)) {
    return res.status(403).json({ message: 'Chỉ admin hoặc quản lý mới có quyền truy cập mục này' });
  }
  next();
}

module.exports = { chiAdminHoacQuanLy };
