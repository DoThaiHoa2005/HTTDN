const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { kiemTraMatKhau } = require('../utils/kiemTra');

// POST /api/quan-ly/dang-nhap
// body: { ten_dang_nhap, mat_khau }
async function dangNhapQuanLy(req, res) {
  const { ten_dang_nhap, mat_khau } = req.body;

  if (!ten_dang_nhap || !mat_khau) {
    return res.status(400).json({ message: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM quanly WHERE ten_dang_nhap = ?',
      [ten_dang_nhap]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const quanLy = rows[0];
    const khopMatKhau = await bcrypt.compare(mat_khau, quanLy.mat_khau);
    if (!khopMatKhau) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { id: quanLy.id, ten_dang_nhap: quanLy.ten_dang_nhap, vai_tro: quanLy.vai_tro, loai: 'quan_ly' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      quanLy: {
        id: quanLy.id,
        ten_dang_nhap: quanLy.ten_dang_nhap,
        ho_ten: quanLy.ho_ten,
        vai_tro: quanLy.vai_tro,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập' });
  }
}

// GET /api/quan-ly/toi - thông tin hiện tại của tài khoản đang đăng nhập (mọi vai trò)
// Frontend dùng để đồng bộ lại vai trò nếu admin vừa đổi quyền
async function thongTinCuaToi(req, res) {
  try {
    const [[ql]] = await pool.query(
      'SELECT id, ten_dang_nhap, ho_ten, vai_tro, ngay_tao FROM quanly WHERE id = ?',
      [req.quanLy.id]
    );
    if (!ql) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    return res.json(ql);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PUT /api/quan-ly/doi-mat-khau - mọi vai trò tự đổi mật khẩu của mình
// body: { mat_khau_cu, mat_khau_moi }
async function doiMatKhauQuanLy(req, res) {
  const { mat_khau_cu, mat_khau_moi } = req.body;

  if (!mat_khau_cu || !mat_khau_moi) {
    return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
  }
  const loiMatKhau = kiemTraMatKhau(mat_khau_moi);
  if (loiMatKhau) return res.status(400).json({ message: loiMatKhau });
  if (mat_khau_cu === mat_khau_moi) {
    return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
  }

  try {
    const [[ql]] = await pool.query('SELECT mat_khau FROM quanly WHERE id = ?', [req.quanLy.id]);
    if (!ql) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const khop = await bcrypt.compare(mat_khau_cu, ql.mat_khau);
    if (!khop) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

    const maHoa = await bcrypt.hash(mat_khau_moi, 10);
    await pool.query('UPDATE quanly SET mat_khau = ? WHERE id = ?', [maHoa, req.quanLy.id]);
    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { dangNhapQuanLy, thongTinCuaToi, doiMatKhauQuanLy };
