const pool = require('../config/db');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');

// GET /api/quan-ly/danh-gia/san-pham - tổng hợp điểm trung bình từng sản phẩm
async function danhGiaSanPham(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const [[{ tongSoBanGhi }]] = await pool.query('SELECT COUNT(*) AS tongSoBanGhi FROM sanpham');

    const [rows] = await pool.query(
      `SELECT sp.id, sp.ten_san_pham, sp.danh_muc,
              AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot_danh_gia
       FROM sanpham sp
       LEFT JOIN danhgiasanpham d ON d.san_pham_id = sp.id
       GROUP BY sp.id, sp.ten_san_pham, sp.danh_muc
       ORDER BY AVG(d.so_sao) IS NULL, AVG(d.so_sao) DESC
       LIMIT ? OFFSET ?`,
      [moiTrang, offset]
    );
    const duLieu = rows.map((r) => ({ ...r, diem_trung_binh: r.diem_trung_binh ? Number(r.diem_trung_binh) : null }));
    return res.json(ketQuaPhanTrang(duLieu, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/danh-gia/san-pham/:id/nhan-xet - danh sách nhận xét cụ thể cho 1 sản phẩm
async function nhanXetSanPham(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const [[{ tongSoBanGhi }]] = await pool.query(
      'SELECT COUNT(*) AS tongSoBanGhi FROM danhgiasanpham WHERE san_pham_id = ?',
      [req.params.id]
    );
    const [rows] = await pool.query(
      `SELECT kh.ho_ten, d.so_sao, d.nhan_xet, d.ngay_danh_gia
       FROM danhgiasanpham d JOIN khachhang kh ON kh.id = d.khach_hang_id
       WHERE d.san_pham_id = ? ORDER BY d.ngay_danh_gia DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, moiTrang, offset]
    );
    return res.json(ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/danh-gia/nhan-vien - tổng hợp điểm trung bình từng nhân viên
async function danhGiaNhanVien(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const [[{ tongSoBanGhi }]] = await pool.query(
      "SELECT COUNT(*) AS tongSoBanGhi FROM quanly WHERE vai_tro != 'admin'"
    );
    const [rows] = await pool.query(
      `SELECT q.id, COALESCE(q.ho_ten, q.ten_dang_nhap) AS ten_hien_thi, q.vai_tro,
              AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot_danh_gia
       FROM quanly q
       LEFT JOIN danhgianhanvien d ON d.quan_ly_id = q.id
       WHERE q.vai_tro != 'admin'
       GROUP BY q.id, ten_hien_thi, q.vai_tro
       ORDER BY AVG(d.so_sao) IS NULL, AVG(d.so_sao) DESC
       LIMIT ? OFFSET ?`,
      [moiTrang, offset]
    );
    const duLieu = rows.map((r) => ({ ...r, diem_trung_binh: r.diem_trung_binh ? Number(r.diem_trung_binh) : null }));
    return res.json(ketQuaPhanTrang(duLieu, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/danh-gia/nhan-vien/:id/nhan-xet
async function nhanXetNhanVien(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const [[{ tongSoBanGhi }]] = await pool.query(
      'SELECT COUNT(*) AS tongSoBanGhi FROM danhgianhanvien WHERE quan_ly_id = ?',
      [req.params.id]
    );
    const [rows] = await pool.query(
      `SELECT kh.ho_ten, d.so_sao, d.nhan_xet, d.ngay_danh_gia
       FROM danhgianhanvien d JOIN khachhang kh ON kh.id = d.khach_hang_id
       WHERE d.quan_ly_id = ? ORDER BY d.ngay_danh_gia DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, moiTrang, offset]
    );
    return res.json(ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { danhGiaSanPham, nhanXetSanPham, danhGiaNhanVien, nhanXetNhanVien };
