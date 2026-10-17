const pool = require('../config/db');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');

// GET /api/san-pham - công khai, ai cũng xem được, chỉ trả sản phẩm đang bán
// Query: danh_muc, tim_kiem, sap_xep (danh_gia|gia_tang|gia_giam|ten_az) (tùy chọn), trang, moi_trang
const SAP_XEP_CONG_KHAI = {
  danh_gia: 'AVG(d.so_sao) IS NULL, AVG(d.so_sao) DESC, COUNT(d.id) DESC, sp.ten_san_pham ASC',
  gia_tang: 'sp.gia ASC',
  gia_giam: 'sp.gia DESC',
  ten_az: 'sp.ten_san_pham ASC',
};

async function danhSachSanPhamCongKhai(req, res) {
  const { danh_muc, tim_kiem, sap_xep } = req.query;
  const { trang, moiTrang, offset } = thamSoPhanTrang(req, 12);

  try {
    let dieuKien = " WHERE sp.trang_thai = 'dang_ban'";
    const thamSo = [];

    if (danh_muc) {
      dieuKien += ' AND sp.danh_muc = ?';
      thamSo.push(danh_muc);
    }
    if (tim_kiem) {
      dieuKien += ' AND sp.ten_san_pham LIKE ?';
      thamSo.push(`%${tim_kiem}%`);
    }

    const [[{ tongSoBanGhi }]] = await pool.query(
      `SELECT COUNT(*) AS tongSoBanGhi FROM sanpham sp${dieuKien}`,
      thamSo
    );

    const [rows] = await pool.query(
      `SELECT sp.id, sp.ten_san_pham, sp.mo_ta, sp.danh_muc, sp.gia, sp.hinh_anh,
              AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot_danh_gia
       FROM sanpham sp
       LEFT JOIN danhgiasanpham d ON d.san_pham_id = sp.id
       ${dieuKien}
       GROUP BY sp.id, sp.ten_san_pham, sp.mo_ta, sp.danh_muc, sp.gia, sp.hinh_anh
       ORDER BY ${SAP_XEP_CONG_KHAI[sap_xep] || 'sp.danh_muc ASC, sp.ten_san_pham ASC'}
       LIMIT ? OFFSET ?`,
      [...thamSo, moiTrang, offset]
    );

    const duLieu = rows.map((r) => ({ ...r, diem_trung_binh: r.diem_trung_binh ? Number(r.diem_trung_binh) : null }));
    return res.json(ketQuaPhanTrang(duLieu, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/san-pham/danh-muc - công khai, danh sách danh mục đang có sản phẩm bán
async function danhSachDanhMucCongKhai(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT danh_muc FROM sanpham WHERE trang_thai = 'dang_ban' AND danh_muc IS NOT NULL ORDER BY danh_muc ASC"
    );
    return res.json(rows.map((r) => r.danh_muc));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/san-pham/:id - công khai, chi tiết 1 sản phẩm (dùng cho trang quét QR đánh giá)
async function chiTietSanPhamCongKhai(req, res) {
  try {
    const [[sp]] = await pool.query(
      `SELECT sp.id, sp.ten_san_pham, sp.mo_ta, sp.danh_muc, sp.gia, sp.hinh_anh,
              AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot_danh_gia
       FROM sanpham sp
       LEFT JOIN danhgiasanpham d ON d.san_pham_id = sp.id
       WHERE sp.id = ? AND sp.trang_thai = 'dang_ban'
       GROUP BY sp.id, sp.ten_san_pham, sp.mo_ta, sp.danh_muc, sp.gia, sp.hinh_anh`,
      [req.params.id]
    );
    if (!sp) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán' });
    }
    return res.json({ ...sp, diem_trung_binh: sp.diem_trung_binh ? Number(sp.diem_trung_binh) : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { danhSachSanPhamCongKhai, danhSachDanhMucCongKhai, chiTietSanPhamCongKhai };
