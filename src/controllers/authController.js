const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { chuanHoaSdt, sdtHopLe, kiemTraMatKhau, kiemTraNgaySinh } = require('../utils/kiemTra');

const SO_VONG_HASH = 10;

function taoToken(khachHang) {
  return jwt.sign(
    { id: khachHang.id, sdt: khachHang.sdt, loai: 'khach_hang' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/dang-ky
// body: { ho_ten, sdt, mat_khau, ngay_sinh, so_thich }
async function dangKy(req, res) {
  const { ho_ten, mat_khau, ngay_sinh, so_thich } = req.body;
  const sdt = chuanHoaSdt(req.body.sdt);

  if (!ho_ten || !ho_ten.trim() || !sdt || !mat_khau) {
    return res.status(400).json({ message: 'Thiếu họ tên, số điện thoại hoặc mật khẩu' });
  }
  if (!sdtHopLe(sdt)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
  }
  const loiMatKhau = kiemTraMatKhau(mat_khau);
  if (loiMatKhau) return res.status(400).json({ message: loiMatKhau });
  const loiNgaySinh = kiemTraNgaySinh(ngay_sinh);
  if (loiNgaySinh) return res.status(400).json({ message: loiNgaySinh });

  try {
    const [existed] = await pool.query('SELECT id FROM khachhang WHERE sdt = ?', [sdt]);
    if (existed.length > 0) {
      return res.status(409).json({ message: 'Số điện thoại đã được đăng ký' });
    }

    const matKhauMaHoa = await bcrypt.hash(mat_khau, SO_VONG_HASH);

    const [result] = await pool.query(
      `INSERT INTO khachhang (ho_ten, sdt, mat_khau, ngay_sinh, so_thich)
       VALUES (?, ?, ?, ?, ?)`,
      [ho_ten.trim(), sdt, matKhauMaHoa, ngay_sinh || null, so_thich || null]
    );

    const khachHang = { id: result.insertId, ho_ten: ho_ten.trim(), sdt, so_thich: so_thich || null };

    return res.status(201).json({
      message: 'Đăng ký thành công',
      token: taoToken(khachHang),
      khachHang,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
  }
}

// POST /api/auth/dang-nhap
// body: { sdt, mat_khau }
async function dangNhap(req, res) {
  const { mat_khau } = req.body;
  const sdt = chuanHoaSdt(req.body.sdt);

  if (!sdt || !mat_khau) {
    return res.status(400).json({ message: 'Thiếu số điện thoại hoặc mật khẩu' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM khachhang WHERE sdt = ?', [sdt]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    const khachHang = rows[0];

    const khopMatKhau = await bcrypt.compare(mat_khau, khachHang.mat_khau);
    if (!khopMatKhau) {
      return res.status(401).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    // Chỉ báo "đã bị khóa" sau khi xác thực đúng mật khẩu, tránh lộ trạng thái tài khoản cho người lạ
    if (khachHang.trang_thai === 'khoa') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa, vui lòng liên hệ quán để được hỗ trợ' });
    }

    return res.json({
      message: 'Đăng nhập thành công',
      token: taoToken(khachHang),
      khachHang: {
        id: khachHang.id,
        ho_ten: khachHang.ho_ten,
        sdt: khachHang.sdt,
        so_thich: khachHang.so_thich,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập' });
  }
}

// GET /api/auth/thong-tin (yêu cầu token) - thông tin cá nhân + tổng hợp hoạt động của khách
async function layThongTin(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, ho_ten, sdt, ngay_sinh, so_thich, ngay_dang_ky FROM khachhang WHERE id = ?',
      [req.khachHang.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    const id = req.khachHang.id;
    const [[phanHoi]] = await pool.query('SELECT COUNT(*) AS n FROM phanhoi WHERE khach_hang_id = ?', [id]);
    const [[dgSanPham]] = await pool.query('SELECT COUNT(*) AS n FROM danhgiasanpham WHERE khach_hang_id = ?', [id]);
    const [[dgNhanVien]] = await pool.query('SELECT COUNT(*) AS n FROM danhgianhanvien WHERE khach_hang_id = ?', [id]);
    const [[khaoSat]] = await pool.query(
      `SELECT COUNT(DISTINCT ch.khao_sat_id) AS n
       FROM ketquakhaosat kq JOIN cauhoi ch ON ch.id = kq.cau_hoi_id
       WHERE kq.khach_hang_id = ?`,
      [id]
    );

    return res.json({
      ...rows[0],
      hoat_dong: {
        phan_hoi: phanHoi.n,
        danh_gia: dgSanPham.n + dgNhanVien.n,
        khao_sat: khaoSat.n,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PUT /api/auth/thong-tin (yêu cầu token)
async function suaThongTin(req, res) {
  const { ho_ten, ngay_sinh, so_thich } = req.body;

  if (!ho_ten || !ho_ten.trim()) {
    return res.status(400).json({ message: 'Họ tên không được để trống' });
  }
  const loiNgaySinh = kiemTraNgaySinh(ngay_sinh);
  if (loiNgaySinh) return res.status(400).json({ message: loiNgaySinh });

  try {
    await pool.query(
      'UPDATE khachhang SET ho_ten = ?, ngay_sinh = ?, so_thich = ? WHERE id = ?',
      [ho_ten.trim(), ngay_sinh || null, so_thich || null, req.khachHang.id]
    );
    return res.json({ message: 'Cập nhật thông tin thành công', ho_ten: ho_ten.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PUT /api/auth/doi-mat-khau (yêu cầu token)
// body: { mat_khau_cu, mat_khau_moi }
async function doiMatKhau(req, res) {
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
    const [[kh]] = await pool.query('SELECT mat_khau FROM khachhang WHERE id = ?', [req.khachHang.id]);
    if (!kh) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });

    const khop = await bcrypt.compare(mat_khau_cu, kh.mat_khau);
    if (!khop) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

    const maHoa = await bcrypt.hash(mat_khau_moi, SO_VONG_HASH);
    await pool.query('UPDATE khachhang SET mat_khau = ? WHERE id = ?', [maHoa, req.khachHang.id]);
    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { dangKy, dangNhap, layThongTin, suaThongTin, doiMatKhau };
