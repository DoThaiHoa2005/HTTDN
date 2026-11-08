// Xuất dữ liệu ra file Excel (.xlsx) cho các trang quản trị.
// Mỗi API dùng lại đúng bộ lọc của trang danh sách tương ứng, nhưng xuất TOÀN BỘ kết quả (không phân trang).
const pool = require('../config/db');
const { likeChuoi } = require('../utils/kiemTra');
const { MAU_NHAN, taoWorkbook, themSheet, guiExcel, dinhDangNgayGio } = require('../utils/xuatExcel');
const { SQL_DEM_TUONG_TAC, SAP_XEP_HOP_LE, tinhBaoCao } = require('./customerAdminController');

const TOI_DA = 20000; // chặn xuất quá nhiều dòng làm nặng máy chủ
const NHAN_VAI_TRO = { admin: 'Admin', quan_ly: 'Quản lý', nhan_vien: 'Nhân viên' };
const NHAN_SAP_XEP = { moi_nhat: 'Mới đăng ký nhất', cu_nhat: 'Cũ nhất', ten_az: 'Tên A → Z', tuong_tac: 'Nhiều tương tác nhất' };

const gio = () => dinhDangNgayGio();
const nguoi = (req) => (req.quanLy && req.quanLy.ten_dang_nhap) || 'quản trị viên';
const dongXuat = (req) => `Xuất lúc: ${gio()} — Người xuất: ${nguoi(req)}`;
const dongLoc = (cacLoc) => `Bộ lọc: ${cacLoc.length ? cacLoc.join('; ') : 'Không (toàn bộ dữ liệu)'}`;
const chiSo = (chiTieu, giaTri, kieu) => ({ chiTieu, giaTri, kieu });

function sheetThongKe(wb, ten, tieuDe, req, hang) {
  themSheet(wb, {
    ten, tieuDe, dong: [dongXuat(req)], hang, khongLoc: true, khongTong: true,
    cot: [{ header: 'Chỉ tiêu', width: 40, dam: true, lay: (h) => h.chiTieu }, { header: 'Giá trị', width: 46, wrap: true, lay: (h) => h.giaTri }],
    kieuO: (h, c) => (c.header === 'Giá trị' ? h.kieu || 'so' : undefined),
  });
}

const tuoiTu = (ns) => {
  if (!ns) return null;
  const d = new Date(ns); const h = new Date();
  let t = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) t--;
  return t;
};

// ---------------- Khách hàng ----------------
async function xuatKhachHang(req, res) {
  const { trang_thai, tim_kiem, sap_xep } = req.query;
  let dk = ' WHERE 1 = 1'; const tham = [];
  const loc = [];
  if (['hoat_dong', 'khoa'].includes(trang_thai)) { dk += ' AND kh.trang_thai = ?'; tham.push(trang_thai); loc.push(`Trạng thái = ${trang_thai === 'khoa' ? 'Đã khóa' : 'Hoạt động'}`); }
  if (tim_kiem) { dk += ' AND (kh.ho_ten LIKE ? OR kh.sdt LIKE ?)'; tham.push(likeChuoi(tim_kiem), likeChuoi(tim_kiem)); loc.push(`Từ khóa = "${String(tim_kiem).slice(0, 100)}"`); }
  const khoaSapXep = SAP_XEP_HOP_LE[sap_xep] ? sap_xep : 'moi_nhat';
  loc.push(`Sắp xếp: ${NHAN_SAP_XEP[khoaSapXep]}`);

  const [rows] = await pool.query(
    `SELECT kh.id, kh.ho_ten, kh.sdt, kh.ngay_sinh, kh.so_thich, kh.trang_thai, kh.ngay_dang_ky, kh.ghi_chu, ${SQL_DEM_TUONG_TAC}
     FROM khachhang kh${dk} ORDER BY ${SAP_XEP_HOP_LE[khoaSapXep]} LIMIT ${TOI_DA}`, tham);
  const now = Date.now();
  const hang = rows.map((k) => {
    const tong = Number(k.so_phan_hoi) + Number(k.so_danh_gia_sp) + Number(k.so_danh_gia_nv) + Number(k.so_khao_sat);
    const soNgay = (now - new Date(k.ngay_dang_ky).getTime()) / 86400000;
    return { ...k, tuoi: tuoiTu(k.ngay_sinh), tong_tuong_tac: tong, phan_khuc: tong >= 5 ? 'Thân thiết' : soNgay <= 30 ? 'Mới' : 'Thường', trang_thai_nhan: k.trang_thai === 'khoa' ? 'Đã khóa' : 'Hoạt động' };
  });

  const wb = taoWorkbook({ tieuDe: 'Danh sách khách hàng', nguoiXuat: nguoi(req) });
  themSheet(wb, {
    ten: 'Khách hàng', tieuDe: 'DANH SÁCH KHÁCH HÀNG', dong: [dongXuat(req), dongLoc(loc)], hang,
    cot: [
      { header: 'STT', width: 6, kieu: 'stt' },
      { header: 'Họ và tên', width: 28, key: 'ho_ten', dam: true },
      { header: 'Số điện thoại', width: 15, key: 'sdt', kieu: 'sdt' },
      { header: 'Ngày sinh', width: 13, key: 'ngay_sinh', kieu: 'ngay' },
      { header: 'Tuổi', width: 7, key: 'tuoi', kieu: 'so' },
      { header: 'Sở thích', width: 18, key: 'so_thich' },
      { header: 'Phân khúc', width: 14, key: 'phan_khuc', canh: 'center', mau: (v) => (v === 'Thân thiết' ? MAU_NHAN.canhBao : v === 'Mới' ? MAU_NHAN.thongTin : null) },
      { header: 'Phản hồi', width: 10, key: 'so_phan_hoi', kieu: 'so', tong: true },
      { header: 'Đánh giá món', width: 12, key: 'so_danh_gia_sp', kieu: 'so', tong: true },
      { header: 'Đánh giá nhân viên', width: 14, key: 'so_danh_gia_nv', kieu: 'so', tong: true },
      { header: 'Khảo sát', width: 10, key: 'so_khao_sat', kieu: 'so', tong: true },
      { header: 'Tổng tương tác', width: 13, key: 'tong_tuong_tac', kieu: 'so', tong: true, dam: true },
      { header: 'Ngày đăng ký', width: 14, key: 'ngay_dang_ky', kieu: 'ngay' },
      { header: 'Trạng thái', width: 13, key: 'trang_thai_nhan', canh: 'center', mau: (v) => (v === 'Đã khóa' ? MAU_NHAN.xau : MAU_NHAN.tot) },
      { header: 'Ghi chú nội bộ', width: 40, key: 'ghi_chu', wrap: true },
    ],
  });
  const dem = (f) => hang.filter(f).length;
  const tongTT = hang.reduce((s, k) => s + k.tong_tuong_tac, 0);
  sheetThongKe(wb, 'Tóm tắt', 'TÓM TẮT DANH SÁCH KHÁCH HÀNG', req, [
    chiSo('Tổng số khách hàng trong bảng', hang.length), chiSo('Đang hoạt động', dem((k) => k.trang_thai === 'hoat_dong')), chiSo('Đã khóa', dem((k) => k.trang_thai === 'khoa')),
    chiSo('Phân khúc Thân thiết', dem((k) => k.phan_khuc === 'Thân thiết')), chiSo('Phân khúc Mới (≤ 30 ngày)', dem((k) => k.phan_khuc === 'Mới')), chiSo('Phân khúc Thường', dem((k) => k.phan_khuc === 'Thường')),
    chiSo('Tổng lượt tương tác', tongTT), chiSo('Tương tác trung bình mỗi khách', hang.length ? tongTT / hang.length : 0, 'diem'),
  ]);
  return guiExcel(res, wb, 'khach-hang', hang.length);
}

// ---------------- Phản hồi ----------------
async function xuatPhanHoi(req, res) {
  const { trang_thai_xu_ly, tim_kiem } = req.query;
  let dk = ' WHERE 1 = 1'; const tham = []; const loc = [];
  if (['cho_xu_ly', 'da_xu_ly'].includes(trang_thai_xu_ly)) { dk += ' AND ph.trang_thai_xu_ly = ?'; tham.push(trang_thai_xu_ly); loc.push(`Trạng thái = ${trang_thai_xu_ly === 'da_xu_ly' ? 'Đã xử lý' : 'Chờ xử lý'}`); }
  if (tim_kiem) { dk += ' AND (ph.noi_dung LIKE ? OR kh.ho_ten LIKE ? OR kh.sdt LIKE ?)'; const l = likeChuoi(tim_kiem); tham.push(l, l, l); loc.push(`Từ khóa = "${String(tim_kiem).slice(0, 100)}"`); }
  const [rows] = await pool.query(
    `SELECT ph.id, ph.noi_dung, ph.ngay_gui, ph.trang_thai_xu_ly, ph.tra_loi, ph.ngay_tra_loi,
            COALESCE(q.ho_ten, q.ten_dang_nhap) AS nguoi_tra_loi, kh.ho_ten, kh.sdt
     FROM phanhoi ph JOIN khachhang kh ON kh.id = ph.khach_hang_id LEFT JOIN quanly q ON q.id = ph.nguoi_tra_loi_id
     ${dk} ORDER BY ph.ngay_gui DESC LIMIT ${TOI_DA}`, tham);
  const hang = rows.map((p) => ({
    ...p, trang_thai_nhan: p.trang_thai_xu_ly === 'da_xu_ly' ? 'Đã xử lý' : 'Chờ xử lý',
    gio_phan_hoi: p.ngay_tra_loi ? (new Date(p.ngay_tra_loi) - new Date(p.ngay_gui)) / 3600000 : null,
  }));
  const wb = taoWorkbook({ tieuDe: 'Phản hồi của khách', nguoiXuat: nguoi(req) });
  themSheet(wb, {
    ten: 'Phản hồi', tieuDe: 'PHẢN HỒI CỦA KHÁCH HÀNG', dong: [dongXuat(req), dongLoc(loc)], hang,
    cot: [
      { header: 'STT', width: 6, kieu: 'stt' },
      { header: 'Khách hàng', width: 24, key: 'ho_ten', dam: true },
      { header: 'Số điện thoại', width: 15, key: 'sdt', kieu: 'sdt' },
      { header: 'Nội dung phản hồi', width: 55, key: 'noi_dung', wrap: true },
      { header: 'Ngày gửi', width: 17, key: 'ngay_gui', kieu: 'ngayGio' },
      { header: 'Trạng thái', width: 13, key: 'trang_thai_nhan', canh: 'center', mau: (v) => (v === 'Đã xử lý' ? MAU_NHAN.tot : MAU_NHAN.canhBao) },
      { header: 'Câu trả lời của quán', width: 50, key: 'tra_loi', wrap: true },
      { header: 'Ngày trả lời', width: 17, key: 'ngay_tra_loi', kieu: 'ngayGio' },
      { header: 'Người trả lời', width: 18, key: 'nguoi_tra_loi' },
      { header: 'Thời gian phản hồi (giờ)', width: 14, key: 'gio_phan_hoi', kieu: 'diem' },
    ],
  });
  const da = hang.filter((p) => p.trang_thai_xu_ly === 'da_xu_ly');
  const co = hang.filter((p) => p.gio_phan_hoi != null);
  sheetThongKe(wb, 'Tóm tắt', 'TÓM TẮT PHẢN HỒI', req, [
    chiSo('Tổng số phản hồi trong bảng', hang.length), chiSo('Đã xử lý', da.length), chiSo('Chờ xử lý', hang.length - da.length),
    chiSo('Tỷ lệ đã xử lý', hang.length ? da.length / hang.length : 0, 'phanTram'),
    chiSo('Thời gian phản hồi trung bình (giờ)', co.length ? co.reduce((s, p) => s + p.gio_phan_hoi, 0) / co.length : 0, 'diem'),
  ]);
  return guiExcel(res, wb, 'phan-hoi', hang.length);
}

// ---------------- Báo cáo khách hàng ----------------
async function xuatBaoCaoKhachHang(req, res) {
  const b = await tinhBaoCao();
  const tong = b.tongSoKhachHang || 0;
  const wb = taoWorkbook({ tieuDe: 'Báo cáo khách hàng', nguoiXuat: nguoi(req) });
  sheetThongKe(wb, 'Tổng quan', 'BÁO CÁO KHÁCH HÀNG — TỔNG QUAN', req, [
    chiSo('Tổng số khách hàng', b.tongTatCa), chiSo('Khách đang hoạt động', b.tongSoKhachHang), chiSo('Khách đã khóa', b.soKhachDaKhoa), chiSo('Khách đăng ký mới trong 30 ngày', b.soKhachMoi30Ngay),
  ]);
  const cotPhanBo = (tenNhom) => [
    { header: tenNhom, width: 28, key: 'nhom', dam: true },
    { header: 'Số khách', width: 14, key: 'so', kieu: 'so', tong: true },
    { header: 'Tỷ lệ', width: 12, key: 'ty_le', kieu: 'phanTram' },
  ];
  const phanBo = (obj, sapXepGiam) => {
    let ds = Object.entries(obj).map(([nhom, so]) => ({ nhom, so, ty_le: tong ? so / tong : 0 }));
    if (sapXepGiam) ds.sort((a, c) => c.so - a.so);
    return ds;
  };
  const dongPB = [dongXuat(req), 'Tính trên các khách hàng đang hoạt động'];
  themSheet(wb, { ten: 'Theo độ tuổi', tieuDe: 'KHÁCH HÀNG THEO ĐỘ TUỔI', dong: dongPB, cot: cotPhanBo('Nhóm tuổi'), hang: phanBo(b.theoDoTuoi), khongLoc: true });
  themSheet(wb, { ten: 'Theo sở thích', tieuDe: 'KHÁCH HÀNG THEO SỞ THÍCH', dong: dongPB, cot: cotPhanBo('Sở thích'), hang: phanBo(b.theoSoThich, true), khongLoc: true });
  const thang = b.theoThang.map((t, i, a) => ({
    thang: `${t.thang.slice(5)}/${t.thang.slice(0, 4)}`, so: t.so_luong,
    tang: i > 0 && a[i - 1].so_luong > 0 ? (t.so_luong - a[i - 1].so_luong) / a[i - 1].so_luong : null,
  }));
  themSheet(wb, {
    ten: 'Khách mới theo tháng', tieuDe: 'KHÁCH ĐĂNG KÝ MỚI THEO THÁNG', dong: [dongXuat(req), '6 tháng gần nhất'], hang: thang, khongLoc: true,
    cot: [{ header: 'Tháng', width: 16, key: 'thang', dam: true, canh: 'center' }, { header: 'Số khách mới', width: 16, key: 'so', kieu: 'so', tong: true }, { header: 'Tăng/giảm so với tháng trước', width: 22, key: 'tang', kieu: 'phanTram', mau: (v, it) => (it.tang == null ? null : it.tang >= 0 ? MAU_NHAN.tot : MAU_NHAN.xau) }],
  });
  return guiExcel(res, wb, 'bao-cao-khach-hang', tong);
}

// ---------------- Thống kê khảo sát ----------------
async function xuatKhaoSat(req, res) {
  const id = Number(req.params.id);
  const [[ks]] = await pool.query(
    `SELECT k.id, k.tieu_de, k.mo_ta, k.ngay_tao, k.trang_thai, COALESCE(q.ho_ten, q.ten_dang_nhap) AS nguoi_tao
     FROM khaosat k LEFT JOIN quanly q ON q.id = k.quan_ly_id WHERE k.id = ?`, [id]);
  if (!ks) return res.status(404).json({ message: 'Không tìm thấy khảo sát' });
  const [cauHoi] = await pool.query('SELECT id, noi_dung_cau_hoi, loai_cau_hoi FROM cauhoi WHERE khao_sat_id = ? ORDER BY id', [id]);
  const ids = cauHoi.map((c) => c.id);
  const [[{ soNguoi }]] = await pool.query(
    `SELECT COUNT(DISTINCT kq.khach_hang_id) AS soNguoi FROM ketquakhaosat kq JOIN cauhoi ch ON ch.id = kq.cau_hoi_id WHERE ch.khao_sat_id = ?`, [id]);
  const NHAN_LOAI = { trac_nghiem: 'Trắc nghiệm', thang_do: 'Thang điểm 1–5', tu_luan: 'Tự luận' };

  let dapAn = [], diem = [], tuLuan = [], chiTiet = [];
  if (ids.length) {
    [dapAn] = await pool.query(`SELECT da.id, da.cau_hoi_id, da.noi_dung, COUNT(kq.id) AS so_luot FROM dapan da LEFT JOIN ketquakhaosat kq ON kq.dap_an_id = da.id WHERE da.cau_hoi_id IN (?) GROUP BY da.id ORDER BY da.cau_hoi_id, da.thu_tu`, [ids]);
    [diem] = await pool.query(`SELECT cau_hoi_id, gia_tri_so, COUNT(*) AS so_luot FROM ketquakhaosat WHERE cau_hoi_id IN (?) AND gia_tri_so IS NOT NULL GROUP BY cau_hoi_id, gia_tri_so`, [ids]);
    [tuLuan] = await pool.query(`SELECT cau_hoi_id, COUNT(*) AS so_luot FROM ketquakhaosat WHERE cau_hoi_id IN (?) AND cau_tra_loi IS NOT NULL AND cau_tra_loi <> '' GROUP BY cau_hoi_id`, [ids]);
    [chiTiet] = await pool.query(
      `SELECT kh.ho_ten, kh.sdt, ch.noi_dung_cau_hoi, ch.loai_cau_hoi, ch.id AS cau_hoi_id, kq.cau_tra_loi, kq.gia_tri_so, da.noi_dung AS dap_an, kq.ngay_thuc_hien
       FROM ketquakhaosat kq JOIN cauhoi ch ON ch.id = kq.cau_hoi_id JOIN khachhang kh ON kh.id = kq.khach_hang_id LEFT JOIN dapan da ON da.id = kq.dap_an_id
       WHERE ch.khao_sat_id = ? ORDER BY kq.ngay_thuc_hien DESC, kh.id, ch.id LIMIT ${TOI_DA}`, [id]);
  }
  // Bảng thống kê theo câu hỏi
  const tk = [];
  cauHoi.forEach((ch, i) => {
    const base = { cau: i + 1, noi_dung: ch.noi_dung_cau_hoi, loai: NHAN_LOAI[ch.loai_cau_hoi] || ch.loai_cau_hoi };
    if (ch.loai_cau_hoi === 'trac_nghiem') {
      const ds = dapAn.filter((d) => d.cau_hoi_id === ch.id); const t = ds.reduce((s, d) => s + Number(d.so_luot), 0);
      ds.forEach((d) => tk.push({ ...base, muc: d.noi_dung, so_luot: Number(d.so_luot), ty_le: t ? Number(d.so_luot) / t : 0 }));
    } else if (ch.loai_cau_hoi === 'thang_do') {
      const ds = diem.filter((d) => d.cau_hoi_id === ch.id); const t = ds.reduce((s, d) => s + Number(d.so_luot), 0);
      for (let m = 5; m >= 1; m--) { const so = Number((ds.find((d) => Number(d.gia_tri_so) === m) || {}).so_luot || 0); tk.push({ ...base, muc: `${m} điểm`, so_luot: so, ty_le: t ? so / t : 0 }); }
      tk.push({ ...base, muc: 'Điểm trung bình', so_luot: t, ty_le: null, diem_tb: t ? ds.reduce((s, d) => s + Number(d.gia_tri_so) * Number(d.so_luot), 0) / t : null, tong_ket: true });
    } else {
      const so = Number((tuLuan.find((d) => d.cau_hoi_id === ch.id) || {}).so_luot || 0);
      tk.push({ ...base, muc: 'Số câu trả lời tự luận (xem sheet "Chi tiết trả lời")', so_luot: so, ty_le: null });
    }
  });
  const wb = taoWorkbook({ tieuDe: `Thống kê khảo sát: ${ks.tieu_de}`, nguoiXuat: nguoi(req) });
  sheetThongKe(wb, 'Tổng quan', 'THỐNG KÊ KHẢO SÁT — TỔNG QUAN', req, [
    chiSo('Tiêu đề khảo sát', ks.tieu_de, 'chuoi'), chiSo('Mô tả', ks.mo_ta || '(không có)', 'chuoi'), chiSo('Người tạo', ks.nguoi_tao || '', 'chuoi'),
    chiSo('Ngày tạo', ks.ngay_tao, 'ngay'), chiSo('Trạng thái', ks.trang_thai === 'dang_mo' ? 'Đang mở' : 'Đã đóng', 'chuoi'),
    chiSo('Số câu hỏi', cauHoi.length), chiSo('Số khách đã trả lời', soNguoi),
  ]);
  themSheet(wb, {
    ten: 'Thống kê câu hỏi', tieuDe: 'KẾT QUẢ THEO TỪNG CÂU HỎI', dong: [dongXuat(req), `Khảo sát: ${ks.tieu_de}`], hang: tk, khongTong: true, khongLoc: true,
    cot: [
      { header: 'Câu', width: 7, key: 'cau', kieu: 'so' }, { header: 'Nội dung câu hỏi', width: 50, key: 'noi_dung', wrap: true, dam: true }, { header: 'Loại', width: 16, key: 'loai' },
      { header: 'Đáp án / Mức điểm', width: 36, key: 'muc', wrap: true }, { header: 'Số lượt', width: 11, key: 'so_luot', kieu: 'so' },
      { header: 'Tỷ lệ', width: 11, key: 'ty_le', kieu: 'phanTram' }, { header: 'Điểm TB', width: 11, key: 'diem_tb', kieu: 'diem2', mau: (v, it) => (it.tong_ket ? MAU_NHAN.canhBao : null) },
    ],
  });
  themSheet(wb, {
    ten: 'Chi tiết trả lời', tieuDe: 'CHI TIẾT CÂU TRẢ LỜI CỦA TỪNG KHÁCH', dong: [dongXuat(req), `Khảo sát: ${ks.tieu_de}`], hang: chiTiet,
    cot: [
      { header: 'STT', width: 6, kieu: 'stt' }, { header: 'Khách hàng', width: 24, key: 'ho_ten', dam: true }, { header: 'Số điện thoại', width: 15, key: 'sdt', kieu: 'sdt' },
      { header: 'Câu hỏi', width: 46, key: 'noi_dung_cau_hoi', wrap: true }, { header: 'Loại', width: 14, lay: (r) => NHAN_LOAI[r.loai_cau_hoi] || r.loai_cau_hoi },
      { header: 'Câu trả lời', width: 40, wrap: true, lay: (r) => (r.loai_cau_hoi === 'tu_luan' ? r.cau_tra_loi : r.loai_cau_hoi === 'thang_do' ? `${r.gia_tri_so} / 5 điểm` : r.dap_an) },
      { header: 'Thời gian', width: 17, key: 'ngay_thuc_hien', kieu: 'ngayGio' },
    ],
  });
  return guiExcel(res, wb, 'khao-sat', chiTiet.length);
}

// ---------------- Đánh giá món & nhân viên ----------------
const mauSao = (v) => (v >= 4 ? MAU_NHAN.tot : v >= 3 ? MAU_NHAN.canhBao : v ? MAU_NHAN.xau : null);
const cotSao = [5, 4, 3, 2, 1].map((s) => ({ header: `${s} sao`, width: 8, key: `s${s}`, kieu: 'so', tong: true }));
async function xuatDanhGia(req, res) {
  const [mon] = await pool.query(
    `SELECT sp.ten_san_pham, sp.danh_muc, COALESCE(AVG(dg.so_sao), 0) AS diem, COUNT(dg.id) AS luot,
            COALESCE(SUM(dg.so_sao = 5),0) AS s5, COALESCE(SUM(dg.so_sao = 4),0) AS s4, COALESCE(SUM(dg.so_sao = 3),0) AS s3, COALESCE(SUM(dg.so_sao = 2),0) AS s2, COALESCE(SUM(dg.so_sao = 1),0) AS s1
     FROM sanpham sp LEFT JOIN danhgiasanpham dg ON dg.san_pham_id = sp.id GROUP BY sp.id ORDER BY luot DESC, diem DESC LIMIT ${TOI_DA}`);
  const [nv] = await pool.query(
    `SELECT COALESCE(q.ho_ten, q.ten_dang_nhap) AS ten, q.vai_tro, q.trang_thai, COALESCE(AVG(dg.so_sao), 0) AS diem, COUNT(dg.id) AS luot,
            COALESCE(SUM(dg.so_sao = 5),0) AS s5, COALESCE(SUM(dg.so_sao = 4),0) AS s4, COALESCE(SUM(dg.so_sao = 3),0) AS s3, COALESCE(SUM(dg.so_sao = 2),0) AS s2, COALESCE(SUM(dg.so_sao = 1),0) AS s1
     FROM quanly q LEFT JOIN danhgianhanvien dg ON dg.quan_ly_id = q.id WHERE q.vai_tro <> 'admin' GROUP BY q.id ORDER BY luot DESC, diem DESC LIMIT ${TOI_DA}`);
  const [nxMon] = await pool.query(
    `SELECT sp.ten_san_pham, kh.ho_ten, kh.sdt, dg.so_sao, dg.nhan_xet, dg.ngay_danh_gia FROM danhgiasanpham dg JOIN sanpham sp ON sp.id = dg.san_pham_id JOIN khachhang kh ON kh.id = dg.khach_hang_id ORDER BY dg.ngay_danh_gia DESC LIMIT ${TOI_DA}`);
  const [nxNv] = await pool.query(
    `SELECT COALESCE(q.ho_ten, q.ten_dang_nhap) AS ten, kh.ho_ten, kh.sdt, dg.so_sao, dg.nhan_xet, dg.ngay_danh_gia FROM danhgianhanvien dg JOIN quanly q ON q.id = dg.quan_ly_id JOIN khachhang kh ON kh.id = dg.khach_hang_id ORDER BY dg.ngay_danh_gia DESC LIMIT ${TOI_DA}`);
  const wb = taoWorkbook({ tieuDe: 'Tổng hợp đánh giá', nguoiXuat: nguoi(req) });
  const dong = [dongXuat(req)];
  const sao = (c) => ({ ...c, mau: undefined });
  themSheet(wb, { ten: 'Tổng hợp món', tieuDe: 'TỔNG HỢP ĐÁNH GIÁ THEO MÓN', dong, hang: mon, cot: [
    { header: 'STT', width: 6, kieu: 'stt' }, { header: 'Món', width: 30, key: 'ten_san_pham', dam: true }, { header: 'Danh mục', width: 16, key: 'danh_muc' },
    { header: 'Điểm trung bình', width: 12, key: 'diem', kieu: 'diem2', mau: (v) => mauSao(Number(v)) }, { header: 'Số lượt', width: 10, key: 'luot', kieu: 'so', tong: true }, ...cotSao.map(sao)] });
  themSheet(wb, { ten: 'Tổng hợp nhân viên', tieuDe: 'TỔNG HỢP ĐÁNH GIÁ THEO NHÂN VIÊN', dong, hang: nv, cot: [
    { header: 'STT', width: 6, kieu: 'stt' }, { header: 'Nhân viên', width: 26, key: 'ten', dam: true }, { header: 'Vai trò', width: 13, lay: (r) => NHAN_VAI_TRO[r.vai_tro] || r.vai_tro },
    { header: 'Tài khoản', width: 12, lay: (r) => (r.trang_thai === 'khoa' ? 'Đã khóa' : 'Hoạt động'), canh: 'center', mau: (v) => (v === 'Đã khóa' ? MAU_NHAN.xau : MAU_NHAN.tot) },
    { header: 'Điểm trung bình', width: 12, key: 'diem', kieu: 'diem2', mau: (v) => mauSao(Number(v)) }, { header: 'Số lượt', width: 10, key: 'luot', kieu: 'so', tong: true }, ...cotSao.map(sao)] });
  const cotNx = (tenCot, key) => [
    { header: 'STT', width: 6, kieu: 'stt' }, { header: tenCot, width: 28, key, dam: true }, { header: 'Khách hàng', width: 22, key: 'ho_ten' }, { header: 'Số điện thoại', width: 15, key: 'sdt', kieu: 'sdt' },
    { header: 'Số sao', width: 9, key: 'so_sao', kieu: 'so', mau: (v) => mauSao(Number(v)) }, { header: 'Nhận xét', width: 52, key: 'nhan_xet', wrap: true }, { header: 'Ngày đánh giá', width: 17, key: 'ngay_danh_gia', kieu: 'ngayGio' }];
  themSheet(wb, { ten: 'Nhận xét món', tieuDe: 'NHẬN XÉT CHI TIẾT VỀ MÓN', dong, hang: nxMon, cot: cotNx('Món', 'ten_san_pham') });
  themSheet(wb, { ten: 'Nhận xét nhân viên', tieuDe: 'NHẬN XÉT CHI TIẾT VỀ NHÂN VIÊN', dong, hang: nxNv, cot: cotNx('Nhân viên', 'ten') });
  return guiExcel(res, wb, 'danh-gia', mon.length + nv.length + nxMon.length + nxNv.length);
}

// ---------------- Sản phẩm (admin) ----------------
async function xuatSanPham(req, res) {
  const { tim_kiem, danh_muc, trang_thai, gia_tu, gia_den } = req.query;
  let dk = ' WHERE 1 = 1'; const tham = []; const loc = [];
  const giaTu = Number(gia_tu), giaDen = Number(gia_den);
  if (gia_tu !== undefined && gia_tu !== '' && Number.isFinite(giaTu)) { dk += ' AND sp.gia >= ?'; tham.push(giaTu); loc.push(`Giá từ ${giaTu.toLocaleString('vi-VN')} ₫`); }
  if (gia_den !== undefined && gia_den !== '' && Number.isFinite(giaDen)) { dk += ' AND sp.gia <= ?'; tham.push(giaDen); loc.push(`Giá đến ${giaDen.toLocaleString('vi-VN')} ₫`); }
  if (tim_kiem) { dk += ' AND sp.ten_san_pham LIKE ?'; tham.push(likeChuoi(tim_kiem)); loc.push(`Từ khóa = "${String(tim_kiem).slice(0, 100)}"`); }
  if (danh_muc) { dk += ' AND sp.danh_muc = ?'; tham.push(String(danh_muc).slice(0, 100)); loc.push(`Danh mục = ${String(danh_muc).slice(0, 100)}`); }
  if (['dang_ban', 'ngung_ban'].includes(trang_thai)) { dk += ' AND sp.trang_thai = ?'; tham.push(trang_thai); loc.push(`Trạng thái = ${trang_thai === 'dang_ban' ? 'Đang bán' : 'Ngừng bán'}`); }
  const [rows] = await pool.query(
    `SELECT sp.ten_san_pham, sp.danh_muc, sp.mo_ta, sp.gia, sp.hinh_anh, sp.trang_thai, sp.ngay_tao,
            (SELECT AVG(so_sao) FROM danhgiasanpham d WHERE d.san_pham_id = sp.id) AS diem_tb,
            (SELECT COUNT(*) FROM danhgiasanpham d WHERE d.san_pham_id = sp.id) AS so_luot
     FROM sanpham sp${dk} ORDER BY sp.danh_muc, sp.ten_san_pham LIMIT ${TOI_DA}`, tham);
  const hang = rows.map((r) => ({ ...r, trang_thai_nhan: r.trang_thai === 'dang_ban' ? 'Đang bán' : 'Ngừng bán', gia: Number(r.gia) }));
  // link ảnh nội bộ (/uploads/...) -> không phải link tuyệt đối nên chỉ hiện dạng chữ
  const wb = taoWorkbook({ tieuDe: 'Danh sách sản phẩm', nguoiXuat: nguoi(req) });
  themSheet(wb, {
    ten: 'Sản phẩm', tieuDe: 'DANH SÁCH SẢN PHẨM (THỰC ĐƠN)', dong: [dongXuat(req), dongLoc(loc)], hang,
    cot: [
      { header: 'STT', width: 6, kieu: 'stt' }, { header: 'Tên sản phẩm', width: 30, key: 'ten_san_pham', dam: true }, { header: 'Danh mục', width: 16, key: 'danh_muc' },
      { header: 'Mô tả', width: 44, key: 'mo_ta', wrap: true }, { header: 'Giá bán', width: 14, key: 'gia', kieu: 'tien' },
      { header: 'Trạng thái', width: 13, key: 'trang_thai_nhan', canh: 'center', mau: (v) => (v === 'Đang bán' ? MAU_NHAN.tot : MAU_NHAN.xau) },
      { header: 'Điểm đánh giá TB', width: 12, key: 'diem_tb', kieu: 'diem2', mau: (v) => (v == null ? null : mauSao(Number(v))) }, { header: 'Số lượt đánh giá', width: 12, key: 'so_luot', kieu: 'so', tong: true },
      { header: 'Hình ảnh', width: 38, key: 'hinh_anh', kieu: 'lienKet' }, { header: 'Ngày tạo', width: 14, key: 'ngay_tao', kieu: 'ngay' },
    ],
  });
  const gia = hang.map((h) => h.gia);
  sheetThongKe(wb, 'Tóm tắt', 'TÓM TẮT THỰC ĐƠN', req, [
    chiSo('Tổng số sản phẩm', hang.length), chiSo('Đang bán', hang.filter((h) => h.trang_thai === 'dang_ban').length), chiSo('Ngừng bán', hang.filter((h) => h.trang_thai === 'ngung_ban').length),
    chiSo('Số danh mục', new Set(hang.map((h) => h.danh_muc)).size), chiSo('Giá trung bình', gia.length ? gia.reduce((a, b) => a + b, 0) / gia.length : 0, 'tien'),
    chiSo('Giá thấp nhất', gia.length ? Math.min(...gia) : 0, 'tien'), chiSo('Giá cao nhất', gia.length ? Math.max(...gia) : 0, 'tien'),
  ]);
  return guiExcel(res, wb, 'san-pham', hang.length);
}

// ---------------- Tài khoản nhân sự (admin) ----------------
async function xuatTaiKhoan(req, res) {
  const [rows] = await pool.query(`SELECT ten_dang_nhap, ho_ten, vai_tro, trang_thai, ngay_tao FROM quanly ORDER BY FIELD(vai_tro,'admin','quan_ly','nhan_vien'), ngay_tao`);
  const wb = taoWorkbook({ tieuDe: 'Tài khoản nhân sự', nguoiXuat: nguoi(req) });
  themSheet(wb, {
    ten: 'Tài khoản', tieuDe: 'DANH SÁCH TÀI KHOẢN NHÂN SỰ', dong: [dongXuat(req), 'Không bao gồm mật khẩu'], hang: rows,
    cot: [
      { header: 'STT', width: 6, kieu: 'stt' }, { header: 'Tên đăng nhập', width: 22, key: 'ten_dang_nhap', dam: true }, { header: 'Tên hiển thị', width: 26, key: 'ho_ten' },
      { header: 'Vai trò', width: 14, lay: (r) => NHAN_VAI_TRO[r.vai_tro] || r.vai_tro, canh: 'center', mau: (v) => (v === 'Admin' ? MAU_NHAN.canhBao : v === 'Quản lý' ? MAU_NHAN.thongTin : null) },
      { header: 'Trạng thái', width: 13, lay: (r) => (r.trang_thai === 'khoa' ? 'Đã khóa' : 'Hoạt động'), canh: 'center', mau: (v) => (v === 'Đã khóa' ? MAU_NHAN.xau : MAU_NHAN.tot) },
      { header: 'Ngày tạo', width: 14, key: 'ngay_tao', kieu: 'ngay' },
    ],
  });
  return guiExcel(res, wb, 'tai-khoan', rows.length);
}

module.exports = { xuatKhachHang, xuatPhanHoi, xuatBaoCaoKhachHang, xuatKhaoSat, xuatDanhGia, xuatSanPham, xuatTaiKhoan };
