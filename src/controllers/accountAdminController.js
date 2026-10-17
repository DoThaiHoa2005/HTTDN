const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');
const { kiemTraMatKhau } = require('../utils/kiemTra');

// GET /api/quan-ly/tai-khoan - không trả về mat_khau
// Chỉ admin mới thấy các tài khoản admin khác; quan_ly xem sẽ không thấy admin
async function danhSachTaiKhoan(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const nguoiXemLaAdmin = req.quanLy.vai_tro === 'admin';
    const dieuKien = nguoiXemLaAdmin ? '' : " WHERE vai_tro != 'admin'";

    const [[{ tongSoBanGhi }]] = await pool.query(`SELECT COUNT(*) AS tongSoBanGhi FROM quanly${dieuKien}`);
    const [rows] = await pool.query(
      `SELECT id, ten_dang_nhap, ho_ten, vai_tro, ngay_tao FROM quanly${dieuKien} ORDER BY ngay_tao ASC LIMIT ? OFFSET ?`,
      [moiTrang, offset]
    );
    return res.json(ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/quan-ly/tai-khoan
// body: { ten_dang_nhap, mat_khau, vai_tro, ho_ten }
async function themTaiKhoan(req, res) {
  const { ten_dang_nhap, mat_khau, vai_tro, ho_ten } = req.body;

  if (!ten_dang_nhap || !mat_khau) {
    return res.status(400).json({ message: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }
  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(ten_dang_nhap)) {
    return res.status(400).json({ message: 'Tên đăng nhập gồm 3-50 ký tự: chữ không dấu, số, dấu gạch dưới (_), chấm (.) hoặc gạch ngang (-)' });
  }
  const loiMatKhau = kiemTraMatKhau(mat_khau);
  if (loiMatKhau) return res.status(400).json({ message: loiMatKhau });
  if (!['admin', 'quan_ly', 'nhan_vien'].includes(vai_tro)) {
    return res.status(400).json({ message: "vai_tro phải là 'admin', 'quan_ly' hoặc 'nhan_vien'" });
  }

  try {
    const [existed] = await pool.query('SELECT id FROM quanly WHERE ten_dang_nhap = ?', [ten_dang_nhap]);
    if (existed.length > 0) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const matKhauMaHoa = await bcrypt.hash(mat_khau, 10);
    const [result] = await pool.query(
      'INSERT INTO quanly (ten_dang_nhap, mat_khau, vai_tro, ho_ten) VALUES (?, ?, ?, ?)',
      [ten_dang_nhap, matKhauMaHoa, vai_tro, ho_ten || null]
    );

    return res.status(201).json({ message: 'Thêm tài khoản thành công', id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/quan-ly/tai-khoan/:id/vai-tro
// body: { vai_tro }
async function phanQuyenTaiKhoan(req, res) {
  const { vai_tro } = req.body;
  const idMucTieu = Number(req.params.id);

  if (!['admin', 'quan_ly', 'nhan_vien'].includes(vai_tro)) {
    return res.status(400).json({ message: "vai_tro phải là 'admin', 'quan_ly' hoặc 'nhan_vien'" });
  }

  try {
    // Không cho tự hạ quyền của chính mình để tránh tự khóa mình khỏi khu Admin
    if (idMucTieu === req.quanLy.id && vai_tro !== 'admin') {
      return res.status(400).json({ message: 'Không thể tự hạ quyền của chính tài khoản đang đăng nhập' });
    }

    // Không cho hạ quyền nếu đây là admin cuối cùng trong hệ thống
    if (vai_tro !== 'admin') {
      const [[{ soAdmin }]] = await pool.query(
        "SELECT COUNT(*) AS soAdmin FROM quanly WHERE vai_tro = 'admin'"
      );
      const [[taiKhoanMucTieu]] = await pool.query('SELECT vai_tro FROM quanly WHERE id = ?', [idMucTieu]);
      if (taiKhoanMucTieu?.vai_tro === 'admin' && soAdmin <= 1) {
        return res.status(400).json({ message: 'Hệ thống phải còn ít nhất 1 tài khoản admin' });
      }
    }

    const [result] = await pool.query('UPDATE quanly SET vai_tro = ? WHERE id = ?', [vai_tro, idMucTieu]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    return res.json({ message: 'Cập nhật phân quyền thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// DELETE /api/quan-ly/tai-khoan/:id
async function xoaTaiKhoan(req, res) {
  const idMucTieu = Number(req.params.id);

  if (idMucTieu === req.quanLy.id) {
    return res.status(400).json({ message: 'Không thể tự xóa tài khoản đang đăng nhập' });
  }

  try {
    const [[taiKhoanMucTieu]] = await pool.query('SELECT vai_tro FROM quanly WHERE id = ?', [idMucTieu]);
    if (!taiKhoanMucTieu) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    if (taiKhoanMucTieu.vai_tro === 'admin') {
      const [[{ soAdmin }]] = await pool.query(
        "SELECT COUNT(*) AS soAdmin FROM quanly WHERE vai_tro = 'admin'"
      );
      if (soAdmin <= 1) {
        return res.status(400).json({ message: 'Hệ thống phải còn ít nhất 1 tài khoản admin' });
      }
    }

    await pool.query('DELETE FROM quanly WHERE id = ?', [idMucTieu]);
    return res.json({ message: 'Xóa tài khoản thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/quan-ly/tai-khoan/:id/ho-ten
async function suaHoTenTaiKhoan(req, res) {
  const { ho_ten } = req.body;
  try {
    const [result] = await pool.query('UPDATE quanly SET ho_ten = ? WHERE id = ?', [ho_ten || null, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    return res.json({ message: 'Cập nhật họ tên thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/quan-ly/tai-khoan/:id/mat-khau - admin đặt lại mật khẩu cho tài khoản khác
// body: { mat_khau_moi }
async function datLaiMatKhauTaiKhoan(req, res) {
  const { mat_khau_moi } = req.body;
  const loiMatKhau = kiemTraMatKhau(mat_khau_moi);
  if (loiMatKhau) return res.status(400).json({ message: loiMatKhau });

  try {
    const maHoa = await bcrypt.hash(mat_khau_moi, 10);
    const [result] = await pool.query('UPDATE quanly SET mat_khau = ? WHERE id = ?', [maHoa, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  danhSachTaiKhoan,
  themTaiKhoan,
  phanQuyenTaiKhoan,
  xoaTaiKhoan,
  suaHoTenTaiKhoan,
  datLaiMatKhauTaiKhoan,
};
