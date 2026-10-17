const pool = require('../config/db');

// ===== ĐÁNH GIÁ SẢN PHẨM =====

// GET /api/danh-gia/san-pham/:id - công khai, xem điểm trung bình + số lượt đánh giá của 1 sản phẩm
async function xemDanhGiaSanPham(req, res) {
  try {
    const [[thongKe]] = await pool.query(
      `SELECT AVG(so_sao) AS diem_trung_binh, COUNT(*) AS so_luot_danh_gia
       FROM danhgiasanpham WHERE san_pham_id = ?`,
      [req.params.id]
    );
    return res.json({
      diem_trung_binh: thongKe.diem_trung_binh ? Number(thongKe.diem_trung_binh) : null,
      so_luot_danh_gia: thongKe.so_luot_danh_gia,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/danh-gia/san-pham (yêu cầu token khách hàng)
// body: { san_pham_id, so_sao, nhan_xet }
async function guiDanhGiaSanPham(req, res) {
  const { san_pham_id, so_sao, nhan_xet } = req.body;

  if (!san_pham_id || !Number.isInteger(Number(so_sao)) || so_sao < 1 || so_sao > 5) {
    return res.status(400).json({ message: 'Thiếu sản phẩm hoặc số sao không hợp lệ (1-5)' });
  }
  if (nhan_xet && String(nhan_xet).length > 1000) {
    return res.status(400).json({ message: 'Nhận xét không được dài quá 1000 ký tự' });
  }

  try {
    const [[sp]] = await pool.query("SELECT id FROM sanpham WHERE id = ? AND trang_thai = 'dang_ban'", [san_pham_id]);
    if (!sp) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán' });
    }
    await pool.query(
      `INSERT INTO danhgiasanpham (khach_hang_id, san_pham_id, so_sao, nhan_xet)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE so_sao = VALUES(so_sao), nhan_xet = VALUES(nhan_xet), ngay_danh_gia = CURRENT_TIMESTAMP`,
      [req.khachHang.id, san_pham_id, so_sao, nhan_xet || null]
    );
    return res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá sản phẩm!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi gửi đánh giá' });
  }
}

// ===== ĐÁNH GIÁ NHÂN VIÊN =====

// GET /api/danh-gia/nhan-vien - công khai, danh sách nhân viên kèm điểm trung bình để khách chọn đánh giá
async function danhSachNhanVienDeDanhGia(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT q.id, COALESCE(q.ho_ten, q.ten_dang_nhap) AS ten_hien_thi,
              AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot_danh_gia
       FROM quanly q
       LEFT JOIN danhgianhanvien d ON d.quan_ly_id = q.id
       WHERE q.vai_tro != 'admin'
       GROUP BY q.id, ten_hien_thi
       ORDER BY ten_hien_thi ASC`
    );
    return res.json(rows.map((r) => ({
      id: r.id,
      ten_hien_thi: r.ten_hien_thi,
      diem_trung_binh: r.diem_trung_binh ? Number(r.diem_trung_binh) : null,
      so_luot_danh_gia: r.so_luot_danh_gia,
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/danh-gia/nhan-vien (yêu cầu token khách hàng)
// body: { quan_ly_id, so_sao, nhan_xet }
async function guiDanhGiaNhanVien(req, res) {
  const { quan_ly_id, so_sao, nhan_xet } = req.body;

  if (!quan_ly_id || !Number.isInteger(Number(so_sao)) || so_sao < 1 || so_sao > 5) {
    return res.status(400).json({ message: 'Thiếu nhân viên hoặc số sao không hợp lệ (1-5)' });
  }
  if (nhan_xet && String(nhan_xet).length > 1000) {
    return res.status(400).json({ message: 'Nhận xét không được dài quá 1000 ký tự' });
  }

  try {
    const [[quanLyMucTieu]] = await pool.query('SELECT vai_tro FROM quanly WHERE id = ?', [quan_ly_id]);
    if (!quanLyMucTieu) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }
    if (quanLyMucTieu.vai_tro === 'admin') {
      return res.status(403).json({ message: 'Không thể đánh giá tài khoản admin' });
    }

    await pool.query(
      `INSERT INTO danhgianhanvien (khach_hang_id, quan_ly_id, so_sao, nhan_xet)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE so_sao = VALUES(so_sao), nhan_xet = VALUES(nhan_xet), ngay_danh_gia = CURRENT_TIMESTAMP`,
      [req.khachHang.id, quan_ly_id, so_sao, nhan_xet || null]
    );
    return res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi gửi đánh giá' });
  }
}

module.exports = {
  xemDanhGiaSanPham,
  guiDanhGiaSanPham,
  danhSachNhanVienDeDanhGia,
  guiDanhGiaNhanVien,
};
