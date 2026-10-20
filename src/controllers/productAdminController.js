const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { DUNG_CLOUDINARY } = require('../middleware/uploadAnh');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');

const COT_SAP_XEP_HOP_LE = {
  gia_tang: 'gia ASC',
  gia_giam: 'gia DESC',
  ten_az: 'ten_san_pham ASC',
  ten_za: 'ten_san_pham DESC',
  moi_nhat: 'ngay_tao DESC',
  cu_nhat: 'ngay_tao ASC',
};

// Xóa file ảnh đã upload khỏi ổ đĩa (chỉ xóa file nằm trong uploads/san-pham, bỏ qua URL ngoài)
function xoaFileAnhCu(duongDan) {
  if (!duongDan || !duongDan.startsWith('/uploads/san-pham/')) return;
  const thuMuc = path.join(__dirname, '../../uploads/san-pham');
  const tenFile = path.basename(duongDan);
  fs.unlink(path.join(thuMuc, tenFile), () => {}); // lỗi (file không tồn tại...) thì bỏ qua
}

// Kiểm tra dữ liệu sản phẩm, trả về chuỗi lỗi hoặc null
function kiemTraSanPham({ ten_san_pham, gia, trang_thai }) {
  if (!ten_san_pham || !String(ten_san_pham).trim()) return 'Thiếu tên sản phẩm';
  if (gia === undefined || gia === null || gia === '' || Number.isNaN(Number(gia)) || Number(gia) < 0) {
    return 'Giá sản phẩm không hợp lệ';
  }
  if (Number(gia) > 99999999) return 'Giá sản phẩm quá lớn';
  if (trang_thai && !['dang_ban', 'ngung_ban'].includes(trang_thai)) return 'Trạng thái không hợp lệ';
  return null;
}

// GET /api/quan-ly/san-pham
// Query: tim_kiem, danh_muc, trang_thai, gia_tu, gia_den, sap_xep, trang, moi_trang
async function danhSachSanPham(req, res) {
  const { tim_kiem, danh_muc, trang_thai, gia_tu, gia_den, sap_xep } = req.query;
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);

  try {
    let dieuKien = ' WHERE 1 = 1';
    const thamSo = [];

    // Tìm kiếm cơ bản: theo tên sản phẩm
    if (tim_kiem) {
      dieuKien += ' AND ten_san_pham LIKE ?';
      thamSo.push(`%${tim_kiem}%`);
    }

    // Tìm kiếm nâng cao: kết hợp nhiều tiêu chí cùng lúc
    if (danh_muc) {
      dieuKien += ' AND danh_muc = ?';
      thamSo.push(danh_muc);
    }
    if (trang_thai) {
      dieuKien += ' AND trang_thai = ?';
      thamSo.push(trang_thai);
    }
    if (gia_tu) {
      dieuKien += ' AND gia >= ?';
      thamSo.push(Number(gia_tu));
    }
    if (gia_den) {
      dieuKien += ' AND gia <= ?';
      thamSo.push(Number(gia_den));
    }

    const [[{ tongSoBanGhi }]] = await pool.query(
      `SELECT COUNT(*) AS tongSoBanGhi FROM sanpham${dieuKien}`,
      thamSo
    );

    const orderBy = COT_SAP_XEP_HOP_LE[sap_xep] || 'ngay_tao DESC';
    const [rows] = await pool.query(
      `SELECT * FROM sanpham${dieuKien} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...thamSo, moiTrang, offset]
    );

    return res.json(ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/san-pham/danh-muc - danh sách danh mục hiện có, phục vụ dropdown lọc
async function danhSachDanhMuc(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT danh_muc FROM sanpham WHERE danh_muc IS NOT NULL ORDER BY danh_muc ASC'
    );
    return res.json(rows.map((r) => r.danh_muc));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/quan-ly/san-pham
async function themSanPham(req, res) {
  const { ten_san_pham, mo_ta, danh_muc, gia, hinh_anh, trang_thai } = req.body;

  const loi = kiemTraSanPham(req.body);
  if (loi) return res.status(400).json({ message: loi });

  try {
    const [result] = await pool.query(
      `INSERT INTO sanpham (ten_san_pham, mo_ta, danh_muc, gia, hinh_anh, trang_thai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ten_san_pham, mo_ta || null, danh_muc || null, gia, hinh_anh || null, trang_thai || 'dang_ban']
    );
    return res.status(201).json({ message: 'Thêm sản phẩm thành công', id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PUT /api/quan-ly/san-pham/:id
async function suaSanPham(req, res) {
  const { ten_san_pham, mo_ta, danh_muc, gia, hinh_anh, trang_thai } = req.body;

  const loi = kiemTraSanPham(req.body);
  if (loi) return res.status(400).json({ message: loi });

  try {
    const [[cu]] = await pool.query('SELECT hinh_anh FROM sanpham WHERE id = ?', [req.params.id]);
    const [result] = await pool.query(
      `UPDATE sanpham
       SET ten_san_pham = ?, mo_ta = ?, danh_muc = ?, gia = ?, hinh_anh = ?, trang_thai = ?
       WHERE id = ?`,
      [ten_san_pham, mo_ta || null, danh_muc || null, gia, hinh_anh || null, trang_thai || 'dang_ban', req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    // Đổi sang ảnh khác => dọn ảnh cũ để không rác ổ đĩa
    if (cu?.hinh_anh && cu.hinh_anh !== (hinh_anh || null)) xoaFileAnhCu(cu.hinh_anh);
    return res.json({ message: 'Cập nhật sản phẩm thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// DELETE /api/quan-ly/san-pham/:id
async function xoaSanPham(req, res) {
  try {
    const [[cu]] = await pool.query('SELECT hinh_anh FROM sanpham WHERE id = ?', [req.params.id]);
    const [result] = await pool.query('DELETE FROM sanpham WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    if (cu?.hinh_anh) xoaFileAnhCu(cu.hinh_anh);
    return res.json({ message: 'Xóa sản phẩm thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/quan-ly/san-pham/upload-anh
// Nhận file field "anh" (multipart/form-data), trả về đường dẫn để lưu vào cột hinh_anh
async function uploadAnhSanPham(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file ảnh nào được gửi lên' });
  }

  // Chạy trên Render: đẩy ảnh lên Cloudinary, trả về URL https vĩnh viễn
  if (DUNG_CLOUDINARY) {
    try {
      const cloudinary = require('cloudinary').v2; // tự đọc biến môi trường CLOUDINARY_URL
      const ketQua = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'cafe-crm/san-pham', resource_type: 'image' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      return res.status(201).json({ url: ketQua.secure_url });
    } catch (err) {
      console.error('Lỗi upload Cloudinary:', err);
      return res.status(500).json({ message: 'Không tải được ảnh lên Cloudinary, kiểm tra CLOUDINARY_URL' });
    }
  }

  // Chạy trên máy cá nhân: lưu đĩa
  const url = `/uploads/san-pham/${req.file.filename}`;
  return res.status(201).json({ url });
}

module.exports = {
  danhSachSanPham,
  danhSachDanhMuc,
  themSanPham,
  suaSanPham,
  xoaSanPham,
  uploadAnhSanPham,
};
