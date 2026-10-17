const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');
const { chuanHoaSdt, sdtHopLe, kiemTraMatKhau, kiemTraNgaySinh } = require('../utils/kiemTra');

// Các biểu thức đếm tương tác của 1 khách hàng (dùng lại ở danh sách + chi tiết)
const SQL_DEM_TUONG_TAC = `
  (SELECT COUNT(*) FROM phanhoi x WHERE x.khach_hang_id = kh.id) AS so_phan_hoi,
  (SELECT COUNT(*) FROM danhgiasanpham x WHERE x.khach_hang_id = kh.id) AS so_danh_gia_sp,
  (SELECT COUNT(*) FROM danhgianhanvien x WHERE x.khach_hang_id = kh.id) AS so_danh_gia_nv,
  (SELECT COUNT(DISTINCT ch.khao_sat_id) FROM ketquakhaosat kq
     JOIN cauhoi ch ON ch.id = kq.cau_hoi_id WHERE kq.khach_hang_id = kh.id) AS so_khao_sat`;

const SAP_XEP_HOP_LE = {
  moi_nhat: 'kh.ngay_dang_ky DESC',
  cu_nhat: 'kh.ngay_dang_ky ASC',
  ten_az: 'kh.ho_ten ASC',
  tuong_tac: '(so_phan_hoi + so_danh_gia_sp + so_danh_gia_nv + so_khao_sat) DESC, kh.ngay_dang_ky DESC',
};

// GET /api/quan-ly/khach-hang?trang_thai=hoat_dong&tim_kiem=an&sap_xep=tuong_tac
async function danhSachKhachHang(req, res) {
  const { trang_thai, tim_kiem, sap_xep } = req.query;
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);

  try {
    let dieuKien = ' WHERE 1 = 1';
    const thamSo = [];

    if (trang_thai) {
      dieuKien += ' AND kh.trang_thai = ?';
      thamSo.push(trang_thai);
    }
    if (tim_kiem) {
      dieuKien += ' AND (kh.ho_ten LIKE ? OR kh.sdt LIKE ?)';
      thamSo.push(`%${tim_kiem}%`, `%${tim_kiem}%`);
    }

    const [[{ tongSoBanGhi }]] = await pool.query(
      `SELECT COUNT(*) AS tongSoBanGhi FROM khachhang kh${dieuKien}`,
      thamSo
    );

    const orderBy = SAP_XEP_HOP_LE[sap_xep] || SAP_XEP_HOP_LE.moi_nhat;
    const [rows] = await pool.query(
      `SELECT kh.id, kh.ho_ten, kh.sdt, kh.ngay_sinh, kh.so_thich, kh.trang_thai, kh.ngay_dang_ky,
              ${SQL_DEM_TUONG_TAC}
       FROM khachhang kh${dieuKien} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...thamSo, moiTrang, offset]
    );

    // Đếm nhanh theo trạng thái (không phụ thuộc bộ lọc trạng thái) để hiện trên các tab
    const [[dem]] = await pool.query(
      `SELECT COUNT(*) AS tat_ca,
              SUM(trang_thai = 'hoat_dong') AS hoat_dong,
              SUM(trang_thai = 'khoa') AS khoa
       FROM khachhang`
    );

    return res.json({
      ...ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang),
      dem: { tat_ca: dem.tat_ca, hoat_dong: Number(dem.hoat_dong || 0), khoa: Number(dem.khoa || 0) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/khach-hang/:id - hồ sơ 360° của 1 khách hàng
async function chiTietKhachHang(req, res) {
  const id = Number(req.params.id);
  try {
    const [[kh]] = await pool.query(
      `SELECT kh.id, kh.ho_ten, kh.sdt, kh.ngay_sinh, kh.so_thich, kh.trang_thai,
              kh.ngay_dang_ky, kh.ghi_chu, ${SQL_DEM_TUONG_TAC}
       FROM khachhang kh WHERE kh.id = ?`,
      [id]
    );
    if (!kh) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });

    const [phanHoi] = await pool.query(
      `SELECT id, noi_dung, ngay_gui, trang_thai_xu_ly, tra_loi, ngay_tra_loi
       FROM phanhoi WHERE khach_hang_id = ? ORDER BY ngay_gui DESC LIMIT 20`,
      [id]
    );
    const [danhGiaSanPham] = await pool.query(
      `SELECT d.id, sp.ten_san_pham AS doi_tuong, d.so_sao, d.nhan_xet, d.ngay_danh_gia
       FROM danhgiasanpham d JOIN sanpham sp ON sp.id = d.san_pham_id
       WHERE d.khach_hang_id = ? ORDER BY d.ngay_danh_gia DESC LIMIT 20`,
      [id]
    );
    const [danhGiaNhanVien] = await pool.query(
      `SELECT d.id, COALESCE(q.ho_ten, q.ten_dang_nhap) AS doi_tuong, d.so_sao, d.nhan_xet, d.ngay_danh_gia
       FROM danhgianhanvien d JOIN quanly q ON q.id = d.quan_ly_id
       WHERE d.khach_hang_id = ? ORDER BY d.ngay_danh_gia DESC LIMIT 20`,
      [id]
    );
    const [khaoSat] = await pool.query(
      `SELECT ks.id, ks.tieu_de, COUNT(kq.id) AS so_cau_tra_loi, MAX(kq.ngay_thuc_hien) AS ngay_thuc_hien
       FROM ketquakhaosat kq
       JOIN cauhoi ch ON ch.id = kq.cau_hoi_id
       JOIN khaosat ks ON ks.id = ch.khao_sat_id
       WHERE kq.khach_hang_id = ?
       GROUP BY ks.id, ks.tieu_de ORDER BY ngay_thuc_hien DESC`,
      [id]
    );

    return res.json({
      ...kh,
      lich_su: {
        phan_hoi: phanHoi,
        danh_gia: [
          ...danhGiaSanPham.map((d) => ({ ...d, loai: 'san_pham' })),
          ...danhGiaNhanVien.map((d) => ({ ...d, loai: 'nhan_vien' })),
        ].sort((a, b) => new Date(b.ngay_danh_gia) - new Date(a.ngay_danh_gia)),
        khao_sat: khaoSat,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/quan-ly/khach-hang
// body: { ho_ten, sdt, mat_khau, ngay_sinh, so_thich }
async function themKhachHang(req, res) {
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
      return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const matKhauMaHoa = await bcrypt.hash(mat_khau, 10);
    const [result] = await pool.query(
      `INSERT INTO khachhang (ho_ten, sdt, mat_khau, ngay_sinh, so_thich)
       VALUES (?, ?, ?, ?, ?)`,
      [ho_ten.trim(), sdt, matKhauMaHoa, ngay_sinh || null, so_thich || null]
    );

    return res.status(201).json({ message: 'Thêm khách hàng thành công', id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PUT /api/quan-ly/khach-hang/:id
// body: { ho_ten, sdt, ngay_sinh, so_thich, ghi_chu }
async function suaKhachHang(req, res) {
  const id = Number(req.params.id);
  const { ho_ten, ngay_sinh, so_thich, ghi_chu } = req.body;
  const sdt = chuanHoaSdt(req.body.sdt);

  if (!ho_ten || !ho_ten.trim() || !sdt) {
    return res.status(400).json({ message: 'Thiếu họ tên hoặc số điện thoại' });
  }
  if (!sdtHopLe(sdt)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
  }
  const loiNgaySinh = kiemTraNgaySinh(ngay_sinh);
  if (loiNgaySinh) return res.status(400).json({ message: loiNgaySinh });

  try {
    const [trung] = await pool.query('SELECT id FROM khachhang WHERE sdt = ? AND id != ?', [sdt, id]);
    if (trung.length > 0) {
      return res.status(409).json({ message: 'Số điện thoại đã thuộc về khách hàng khác' });
    }

    const [result] = await pool.query(
      `UPDATE khachhang SET ho_ten = ?, sdt = ?, ngay_sinh = ?, so_thich = ?, ghi_chu = ? WHERE id = ?`,
      [ho_ten.trim(), sdt, ngay_sinh || null, so_thich || null, ghi_chu ? String(ghi_chu).trim() || null : null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    return res.json({ message: 'Cập nhật khách hàng thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// DELETE /api/quan-ly/khach-hang/:id
async function xoaKhachHang(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM khachhang WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    return res.json({ message: 'Xóa khách hàng thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/quan-ly/khach-hang/:id/trang-thai
// body: { trang_thai: 'khoa' | 'hoat_dong' }
async function doiTrangThaiKhachHang(req, res) {
  const { trang_thai } = req.body;

  if (!['khoa', 'hoat_dong'].includes(trang_thai)) {
    return res.status(400).json({ message: "trang_thai phải là 'khoa' hoặc 'hoat_dong'" });
  }

  try {
    const [result] = await pool.query(
      'UPDATE khachhang SET trang_thai = ? WHERE id = ?',
      [trang_thai, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    return res.json({ message: `Cập nhật trạng thái thành '${trang_thai}' thành công` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// Tính tuổi chính xác theo ngày sinh (không chỉ lệch năm)
function tinhTuoi(ngaySinh) {
  const sinh = new Date(ngaySinh);
  const nay = new Date();
  let tuoi = nay.getFullYear() - sinh.getFullYear();
  const chuaSinhNhat =
    nay.getMonth() < sinh.getMonth() ||
    (nay.getMonth() === sinh.getMonth() && nay.getDate() < sinh.getDate());
  if (chuaSinhNhat) tuoi -= 1;
  return tuoi;
}

// GET /api/quan-ly/khach-hang/bao-cao
// Báo cáo tỷ lệ độ tuổi + sở thích + tăng trưởng khách hàng theo tháng
async function baoCaoKhachHang(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ngay_sinh, so_thich FROM khachhang WHERE trang_thai = 'hoat_dong'`
    );

    const nhomTuoi = { 'Dưới 18': 0, '18-25': 0, '26-35': 0, '36-50': 0, 'Trên 50': 0, 'Chưa rõ': 0 };
    const nhomSoThich = {};

    for (const kh of rows) {
      if (!kh.ngay_sinh) {
        nhomTuoi['Chưa rõ']++;
      } else {
        const tuoi = tinhTuoi(kh.ngay_sinh);
        if (tuoi < 18) nhomTuoi['Dưới 18']++;
        else if (tuoi <= 25) nhomTuoi['18-25']++;
        else if (tuoi <= 35) nhomTuoi['26-35']++;
        else if (tuoi <= 50) nhomTuoi['36-50']++;
        else nhomTuoi['Trên 50']++;
      }

      const soThich = kh.so_thich && kh.so_thich.trim() !== '' ? kh.so_thich.trim() : 'Chưa cập nhật';
      nhomSoThich[soThich] = (nhomSoThich[soThich] || 0) + 1;
    }

    // Khách đăng ký mới theo 6 tháng gần nhất (điền 0 cho tháng không có ai)
    const [theoThangRows] = await pool.query(
      `SELECT DATE_FORMAT(ngay_dang_ky, '%Y-%m') AS thang, COUNT(*) AS so_luong
       FROM khachhang
       WHERE ngay_dang_ky >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
       GROUP BY thang`
    );
    const bangThang = Object.fromEntries(theoThangRows.map((r) => [r.thang, Number(r.so_luong)]));
    const theoThang = [];
    const hienTai = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hienTai.getFullYear(), hienTai.getMonth() - i, 1);
      const khoa = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      theoThang.push({ thang: khoa, so_luong: bangThang[khoa] || 0 });
    }

    const [[tong]] = await pool.query(
      `SELECT COUNT(*) AS tat_ca, SUM(trang_thai = 'khoa') AS da_khoa,
              SUM(ngay_dang_ky >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS moi_30_ngay
       FROM khachhang`
    );

    return res.json({
      tongSoKhachHang: rows.length,
      tongTatCa: tong.tat_ca,
      soKhachDaKhoa: Number(tong.da_khoa || 0),
      soKhachMoi30Ngay: Number(tong.moi_30_ngay || 0),
      theoDoTuoi: nhomTuoi,
      theoSoThich: nhomSoThich,
      theoThang,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi tạo báo cáo' });
  }
}

module.exports = {
  danhSachKhachHang,
  chiTietKhachHang,
  themKhachHang,
  suaKhachHang,
  xoaKhachHang,
  doiTrangThaiKhachHang,
  baoCaoKhachHang,
};
