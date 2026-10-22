const pool = require('../config/db');
const { likeChuoi } = require('../utils/kiemTra');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');

// GET /api/quan-ly/phan-hoi?trang_thai_xu_ly=cho_xu_ly&tim_kiem=...&trang=1&moi_trang=10
async function danhSachPhanHoi(req, res) {
  const { trang_thai_xu_ly, tim_kiem } = req.query;
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);

  try {
    let dieuKien = ' WHERE 1 = 1';
    const thamSo = [];

    if (trang_thai_xu_ly) {
      dieuKien += ' AND ph.trang_thai_xu_ly = ?';
      thamSo.push(trang_thai_xu_ly);
    }
    if (tim_kiem) {
      dieuKien += ' AND (ph.noi_dung LIKE ? OR kh.ho_ten LIKE ? OR kh.sdt LIKE ?)';
      thamSo.push(likeChuoi(tim_kiem), likeChuoi(tim_kiem), likeChuoi(tim_kiem));
    }

    const [[{ tongSoBanGhi }]] = await pool.query(
      `SELECT COUNT(*) AS tongSoBanGhi
       FROM phanhoi ph JOIN khachhang kh ON kh.id = ph.khach_hang_id${dieuKien}`,
      thamSo
    );

    const [rows] = await pool.query(
      `SELECT ph.id, ph.noi_dung, ph.ngay_gui, ph.trang_thai_xu_ly,
              ph.tra_loi, ph.ngay_tra_loi,
              COALESCE(q.ho_ten, q.ten_dang_nhap) AS nguoi_tra_loi,
              kh.id AS khach_hang_id, kh.ho_ten, kh.sdt
       FROM phanhoi ph
       JOIN khachhang kh ON kh.id = ph.khach_hang_id
       LEFT JOIN quanly q ON q.id = ph.nguoi_tra_loi_id
       ${dieuKien}
       ORDER BY ph.ngay_gui DESC
       LIMIT ? OFFSET ?`,
      [...thamSo, moiTrang, offset]
    );

    // Đếm theo trạng thái (không phụ thuộc bộ lọc) để hiện trên các tab
    const [[dem]] = await pool.query(
      `SELECT COUNT(*) AS tat_ca,
              SUM(trang_thai_xu_ly = 'cho_xu_ly') AS cho_xu_ly,
              SUM(trang_thai_xu_ly = 'da_xu_ly') AS da_xu_ly
       FROM phanhoi`
    );

    return res.json({
      ...ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang),
      dem: {
        tat_ca: dem.tat_ca,
        cho_xu_ly: Number(dem.cho_xu_ly || 0),
        da_xu_ly: Number(dem.da_xu_ly || 0),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/quan-ly/phan-hoi/:id
// body: { trang_thai_xu_ly?: 'da_xu_ly' | 'cho_xu_ly', tra_loi?: string }
// Nếu có tra_loi (khác rỗng) => lưu câu trả lời và tự đánh dấu 'da_xu_ly'
async function capNhatTrangThaiPhanHoi(req, res) {
  const { trang_thai_xu_ly, tra_loi } = req.body;
  const coTraLoi = typeof tra_loi === 'string' && tra_loi.trim() !== '';

  if (!coTraLoi && !['cho_xu_ly', 'da_xu_ly'].includes(trang_thai_xu_ly)) {
    return res.status(400).json({ message: 'trang_thai_xu_ly không hợp lệ' });
  }
  if (coTraLoi && tra_loi.trim().length > 1000) {
    return res.status(400).json({ message: 'Câu trả lời không được dài quá 1000 ký tự' });
  }

  try {
    let result;
    if (coTraLoi) {
      [result] = await pool.query(
        `UPDATE phanhoi
         SET tra_loi = ?, ngay_tra_loi = NOW(), nguoi_tra_loi_id = ?, trang_thai_xu_ly = 'da_xu_ly'
         WHERE id = ?`,
        [tra_loi.trim(), req.quanLy.id, req.params.id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE phanhoi SET trang_thai_xu_ly = ? WHERE id = ?',
        [trang_thai_xu_ly, req.params.id]
      );
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy phản hồi' });
    }
    return res.json({ message: coTraLoi ? 'Đã gửi câu trả lời cho khách hàng' : 'Cập nhật trạng thái phản hồi thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { danhSachPhanHoi, capNhatTrangThaiPhanHoi };
