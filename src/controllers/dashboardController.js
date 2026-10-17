const pool = require('../config/db');

function khoaNgay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/quan-ly/tong-quan - số liệu cho trang Tổng quan của quản lý
async function tongQuan(req, res) {
  try {
    // ----- Khách hàng -----
    const [[kh]] = await pool.query(
      `SELECT COUNT(*) AS tong,
              SUM(trang_thai = 'khoa') AS da_khoa,
              SUM(ngay_dang_ky >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS moi_30_ngay,
              SUM(ngay_dang_ky >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                  AND ngay_dang_ky < DATE_SUB(NOW(), INTERVAL 30 DAY)) AS moi_30_ngay_truoc
       FROM khachhang`
    );

    // ----- Phản hồi -----
    const [[ph]] = await pool.query(
      `SELECT COUNT(*) AS tong, SUM(trang_thai_xu_ly = 'cho_xu_ly') AS cho_xu_ly FROM phanhoi`
    );

    // ----- Khảo sát -----
    const [[ks]] = await pool.query(
      `SELECT COUNT(*) AS tong, SUM(trang_thai = 'dang_mo') AS dang_mo FROM khaosat`
    );
    const [[{ soNguoiTraLoi }]] = await pool.query(
      `SELECT COUNT(DISTINCT khach_hang_id) AS soNguoiTraLoi FROM ketquakhaosat`
    );

    // ----- Đánh giá -----
    const [[dgSp]] = await pool.query('SELECT AVG(so_sao) AS tb, COUNT(*) AS n FROM danhgiasanpham');
    const [[dgNv]] = await pool.query('SELECT AVG(so_sao) AS tb, COUNT(*) AS n FROM danhgianhanvien');
    const [[sp]] = await pool.query(
      `SELECT COUNT(*) AS tong, SUM(trang_thai = 'dang_ban') AS dang_ban FROM sanpham`
    );

    // Phân bố số sao (gộp sản phẩm + nhân viên)
    const [phanBoRows] = await pool.query(
      `SELECT so_sao, COUNT(*) AS n FROM (
         SELECT so_sao FROM danhgiasanpham UNION ALL SELECT so_sao FROM danhgianhanvien
       ) t GROUP BY so_sao`
    );
    const phanBoSao = [5, 4, 3, 2, 1].map((s) => ({
      so_sao: s,
      so_luot: Number(phanBoRows.find((r) => r.so_sao === s)?.n || 0),
    }));

    // ----- Khách đăng ký mới theo 6 tháng -----
    const [thangRows] = await pool.query(
      `SELECT DATE_FORMAT(ngay_dang_ky, '%Y-%m') AS thang, COUNT(*) AS n
       FROM khachhang
       WHERE ngay_dang_ky >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
       GROUP BY thang`
    );
    const bangThang = Object.fromEntries(thangRows.map((r) => [r.thang, Number(r.n)]));
    const khachTheoThang = [];
    const homNay = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(homNay.getFullYear(), homNay.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      khachTheoThang.push({ thang: k, so_luong: bangThang[k] || 0 });
    }

    // ----- Tương tác 14 ngày gần đây (phản hồi / đánh giá / khảo sát) -----
    const cacNguon = {
      phan_hoi: `SELECT DATE_FORMAT(ngay_gui, '%Y-%m-%d') AS ngay, COUNT(*) AS n FROM phanhoi
                 WHERE ngay_gui >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY ngay`,
      danh_gia: `SELECT ngay, SUM(n) AS n FROM (
                   SELECT DATE_FORMAT(ngay_danh_gia, '%Y-%m-%d') AS ngay, COUNT(*) AS n FROM danhgiasanpham
                     WHERE ngay_danh_gia >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY ngay
                   UNION ALL
                   SELECT DATE_FORMAT(ngay_danh_gia, '%Y-%m-%d') AS ngay, COUNT(*) AS n FROM danhgianhanvien
                     WHERE ngay_danh_gia >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY ngay
                 ) t GROUP BY ngay`,
      khao_sat: `SELECT ngay, COUNT(*) AS n FROM (
                   SELECT DISTINCT khach_hang_id, DATE_FORMAT(ngay_thuc_hien, '%Y-%m-%d') AS ngay
                   FROM ketquakhaosat WHERE ngay_thuc_hien >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
                 ) t GROUP BY ngay`,
    };
    const duLieuNguon = {};
    for (const [ten, sql] of Object.entries(cacNguon)) {
      const [rows] = await pool.query(sql);
      duLieuNguon[ten] = Object.fromEntries(rows.map((r) => [r.ngay, Number(r.n)]));
    }
    const tuongTac14Ngay = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(homNay.getFullYear(), homNay.getMonth(), homNay.getDate() - i);
      const k = khoaNgay(d);
      tuongTac14Ngay.push({
        ngay: k,
        phan_hoi: duLieuNguon.phan_hoi[k] || 0,
        danh_gia: duLieuNguon.danh_gia[k] || 0,
        khao_sat: duLieuNguon.khao_sat[k] || 0,
      });
    }

    // ----- Phản hồi mới nhất đang chờ -----
    const [phanHoiGanDay] = await pool.query(
      `SELECT ph.id, ph.noi_dung, ph.ngay_gui, ph.trang_thai_xu_ly, kh.ho_ten
       FROM phanhoi ph JOIN khachhang kh ON kh.id = ph.khach_hang_id
       ORDER BY (ph.trang_thai_xu_ly = 'cho_xu_ly') DESC, ph.ngay_gui DESC LIMIT 5`
    );

    // ----- Xếp hạng -----
    const [topSanPham] = await pool.query(
      `SELECT sp.id, sp.ten_san_pham, sp.hinh_anh, AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot
       FROM sanpham sp JOIN danhgiasanpham d ON d.san_pham_id = sp.id
       GROUP BY sp.id, sp.ten_san_pham, sp.hinh_anh
       ORDER BY AVG(d.so_sao) DESC, COUNT(d.id) DESC LIMIT 5`
    );
    const [topNhanVien] = await pool.query(
      `SELECT q.id, COALESCE(q.ho_ten, q.ten_dang_nhap) AS ten_hien_thi, AVG(d.so_sao) AS diem_trung_binh, COUNT(d.id) AS so_luot
       FROM quanly q JOIN danhgianhanvien d ON d.quan_ly_id = q.id
       WHERE q.vai_tro != 'admin'
       GROUP BY q.id, ten_hien_thi
       ORDER BY AVG(d.so_sao) DESC, COUNT(d.id) DESC LIMIT 5`
    );

    const chuyenDiem = (r) => ({ ...r, diem_trung_binh: Number(r.diem_trung_binh), so_luot: Number(r.so_luot) });

    return res.json({
      khach_hang: {
        tong: kh.tong,
        da_khoa: Number(kh.da_khoa || 0),
        moi_30_ngay: Number(kh.moi_30_ngay || 0),
        moi_30_ngay_truoc: Number(kh.moi_30_ngay_truoc || 0),
      },
      phan_hoi: { tong: ph.tong, cho_xu_ly: Number(ph.cho_xu_ly || 0) },
      khao_sat: { tong: ks.tong, dang_mo: Number(ks.dang_mo || 0), so_nguoi_tra_loi: soNguoiTraLoi },
      danh_gia: {
        san_pham: { diem_tb: dgSp.tb ? Number(dgSp.tb) : null, so_luot: dgSp.n },
        nhan_vien: { diem_tb: dgNv.tb ? Number(dgNv.tb) : null, so_luot: dgNv.n },
        phan_bo_sao: phanBoSao,
      },
      san_pham: { tong: sp.tong, dang_ban: Number(sp.dang_ban || 0) },
      khach_theo_thang: khachTheoThang,
      tuong_tac_14_ngay: tuongTac14Ngay,
      phan_hoi_gan_day: phanHoiGanDay,
      top_san_pham: topSanPham.map(chuyenDiem),
      top_nhan_vien: topNhanVien.map(chuyenDiem),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy số liệu tổng quan' });
  }
}

module.exports = { tongQuan };
