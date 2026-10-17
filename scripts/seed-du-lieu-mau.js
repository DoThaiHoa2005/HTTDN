// Nạp DỮ LIỆU MẪU để demo/thuyết trình: khách hàng, phản hồi, khảo sát, đánh giá, sản phẩm...
// Dữ liệu được sinh ngẫu nhiên có kiểm soát (cố định hạt giống) nên chạy lại ra cùng kết quả.
//
// Cách dùng (trong thư mục cafe-crm-backend, sau khi đã import CSDL và tạo tài khoản admin):
//   npm run seed
//
// Script chỉ chạy 1 lần: nếu phát hiện đã có dữ liệu mẫu (SĐT 0910000xxx) sẽ tự dừng.
// Mật khẩu của mọi khách hàng mẫu: matkhau123  |  mọi nhân viên mẫu: nhanvien123

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');
const { damBaoCauTruc } = require('../src/config/ensureSchema');

// ---------- Bộ sinh số ngẫu nhiên có hạt giống (mulberry32) ----------
function taoRandom(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = taoRandom(20261014);
const chonNgauNhien = (arr) => arr[Math.floor(rand() * arr.length)];
const soNguyen = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
function chonCoTrongSo(cacMuc) {
  const tong = cacMuc.reduce((s, m) => s + m[1], 0);
  let r = rand() * tong;
  for (const [giaTri, trongSo] of cacMuc) {
    if ((r -= trongSo) <= 0) return giaTri;
  }
  return cacMuc[0][0];
}

function ngayLui(soNgay, gio = soNguyen(7, 21), phut = soNguyen(0, 59)) {
  const d = new Date();
  d.setDate(d.getDate() - soNgay);
  d.setHours(gio, phut, soNguyen(0, 59), 0);
  // Không sinh thời điểm ở tương lai
  if (d > new Date()) return new Date(Date.now() - soNguyen(1, 300) * 60000);
  return d;
}

// ---------- Dữ liệu nguồn ----------
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM_TEN = [
  ['Minh', 'Anh'], ['Quốc', 'Bảo'], ['Thu', 'Hà'], ['Ngọc', 'Lan'], ['Hoàng', 'Long'], ['Thanh', 'Tâm'], ['Gia', 'Huy'],
  ['Phương', 'Thảo'], ['Đức', 'Khoa'], ['Khánh', 'Linh'], ['Bảo', 'Châu'], ['Tuấn', 'Kiệt'], ['Mai', 'Phương'], ['Thành', 'Đạt'],
  ['Hải', 'Yến'], ['Anh', 'Thư'], ['Trung', 'Hiếu'], ['Diệu', 'Hương'], ['Hữu', 'Phúc'], ['Kim', 'Ngân'],
];
const SO_THICH = [['Cà phê sữa', 30], ['Cà phê đen', 20], ['Trà', 24], ['Nước ép', 10], ['Khác', 6], [null, 10]];

const PHAN_HOI_MAU = [
  ['Cà phê rất thơm, nhưng giờ cao điểm nhân viên hơi chậm.', 'Cảm ơn bạn đã góp ý! Quán đã bổ sung thêm người ở khung giờ cao điểm 7-9h sáng.'],
  ['Quán nên có thêm ổ điện cho khách làm việc laptop.', 'Quán đã ghi nhận và sẽ lắp thêm ổ điện ở khu cửa sổ trong tháng này nhé.'],
  ['Mình thích không gian yên tĩnh, nhạc nhẹ nhàng rất hợp để làm việc.', 'Cảm ơn bạn! Quán sẽ tiếp tục giữ không gian này.'],
  ['Trà đào hôm nay hơi ngọt so với lần trước.', 'Quán xin lỗi về điều này, bên mình đã nhắc lại bộ phận pha chế điều chỉnh độ ngọt tiêu chuẩn.'],
  ['Mong quán có thêm bánh ngọt ăn kèm buổi chiều.', 'Tin vui: quán vừa bổ sung bánh tiramisu và croissant vào thực đơn, mời bạn ghé thử!'],
  ['Wifi hơi yếu ở góc trong cùng.', null],
  ['Nhân viên rất thân thiện, nhớ tên khách quen. Cảm ơn quán!', 'Cảm ơn bạn đã ủng hộ quán! Lời khen này sẽ được chuyển đến cả đội.'],
  ['Mình bị nhầm đơn một lần, cà phê sữa thành bạc xỉu.', 'Quán xin lỗi bạn vì sự nhầm lẫn. Lần sau bạn ghé, quán xin mời một ly nhé.'],
  ['Giá hơi cao so với quán bên cạnh nhưng chất lượng xứng đáng.', null],
  ['Điều hòa hơi lạnh vào buổi chiều.', null],
  ['Mong quán mở cửa sớm hơn vào cuối tuần.', null],
  ['Ly takeaway nên có nắp chống đổ tốt hơn.', null],
];
const NHAN_XET_SP = [
  'Vị đậm đà, hậu ngọt rất ổn.', 'Uống rất thơm, sẽ quay lại.', 'Hơi ngọt với mình nhưng vẫn ngon.',
  'Đúng vị cà phê phin truyền thống.', 'Rất mát, hợp ngày nắng.', 'Chuẩn vị, giá hợp lý.', 'Trình bày đẹp.',
];
const NHAN_XET_NV = [
  'Nhân viên phục vụ nhanh và thân thiện.', 'Tư vấn món rất nhiệt tình.', 'Hơi chậm vào giờ đông khách.',
  'Luôn mỉm cười, rất dễ chịu.', 'Chuyên nghiệp, nhớ món mình hay uống.',
];
const TRA_LOI_TU_LUAN = [
  'Muốn có thêm chỗ ngồi ngoài trời.', 'Nên có chương trình tích điểm cho khách quen.', 'Mọi thứ đều ổn, cảm ơn quán.',
  'Thêm các món ăn nhẹ buổi sáng.', 'Mở thêm ổ cắm điện cho khách làm việc.', 'Giữ không gian yên tĩnh như hiện tại.',
];

const SAN_PHAM_THEM = [
  ['Espresso', 'Một shot đậm đặc, hậu vị caramel', 'Cà phê', 35000],
  ['Cappuccino', 'Espresso với lớp bọt sữa dày mịn', 'Cà phê', 45000],
  ['Latte', 'Espresso và sữa tươi đánh nóng', 'Cà phê', 45000],
  ['Cold brew', 'Ủ lạnh 16 giờ, vị êm và ít chua', 'Cà phê', 49000],
  ['Trà vải hoa hồng', 'Trà ô long, vải và cánh hoa hồng', 'Trà', 39000],
  ['Trà sen vàng', 'Trà xanh hạt sen, kem cheese béo nhẹ', 'Trà', 42000],
  ['Sinh tố bơ', 'Bơ sáp xay cùng sữa đặc', 'Sinh tố', 49000],
  ['Bánh tiramisu', 'Bánh lạnh vị cà phê và cacao', 'Bánh', 45000],
  ['Bánh croissant', 'Bánh sừng bò bơ nướng mỗi sáng', 'Bánh', 35000],
];

async function main() {
  await damBaoCauTruc();

  const [[{ daCo }]] = await pool.query("SELECT COUNT(*) AS daCo FROM khachhang WHERE sdt LIKE '0910000%'");
  if (daCo > 0) {
    console.log('Đã có dữ liệu mẫu trong CSDL, không nạp lại. (Muốn nạp lại: import lại CSDL gốc rồi chạy lại.)');
    return;
  }

  const [[admin]] = await pool.query("SELECT id FROM quanly WHERE vai_tro = 'admin' ORDER BY id LIMIT 1");
  if (!admin) {
    console.log('Chưa có tài khoản admin. Hãy chạy trước: node scripts/tao-tai-khoan-quan-ly.js admin MatKhau123 admin');
    return;
  }

  const matKhauKhach = await bcrypt.hash('matkhau123', 10);
  const matKhauNhanVien = await bcrypt.hash('nhanvien123', 10);

  // ---------- 1. Nhân viên ----------
  const nhanVienMau = [
    ['nhanvien1', 'Trần Minh Anh', 'nhan_vien'],
    ['nhanvien2', 'Lê Quốc Bảo', 'nhan_vien'],
    ['nhanvien3', 'Phạm Thu Hà', 'nhan_vien'],
    ['quanly_ca', 'Nguyễn Hoàng Long', 'quan_ly'],
  ];
  const idNhanVien = [];
  for (const [ten, hoTen, vaiTro] of nhanVienMau) {
    const [[co]] = await pool.query('SELECT id FROM quanly WHERE ten_dang_nhap = ?', [ten]);
    if (co) { idNhanVien.push(co.id); continue; }
    const [r] = await pool.query(
      'INSERT INTO quanly (ten_dang_nhap, ho_ten, mat_khau, vai_tro) VALUES (?, ?, ?, ?)',
      [ten, hoTen, matKhauNhanVien, vaiTro]
    );
    idNhanVien.push(r.insertId);
  }
  // Người có thể trả lời phản hồi/tạo khảo sát: admin + quản lý ca
  const idNguoiTraLoi = [admin.id, idNhanVien[3]];

  // ---------- 2. Sản phẩm ----------
  for (const [ten, moTa, danhMuc, gia] of SAN_PHAM_THEM) {
    const [[co]] = await pool.query('SELECT id FROM sanpham WHERE ten_san_pham = ?', [ten]);
    if (!co) {
      await pool.query(
        'INSERT INTO sanpham (ten_san_pham, mo_ta, danh_muc, gia, trang_thai) VALUES (?, ?, ?, ?, ?)',
        [ten, moTa, danhMuc, gia, 'dang_ban']
      );
    }
  }
  const [sanPhamBan] = await pool.query("SELECT id FROM sanpham WHERE trang_thai = 'dang_ban'");
  const dsSanPhamId = sanPhamBan.map((s) => s.id);
  // Gán độ "được yêu thích" khác nhau cho từng sản phẩm để biểu đồ xếp hạng có ý nghĩa
  const diemCoBan = Object.fromEntries(dsSanPhamId.map((id) => [id, 3.4 + rand() * 1.5]));

  // ---------- 3. Khách hàng ----------
  const khachHang = [];
  const tenDaDung = new Set();
  for (let i = 0; i < 42; i++) {
    let ho, dem, ten;
    do { // đảm bảo tên không trùng nhau để demo dễ nhìn
      ho = chonNgauNhien(HO);
      [dem, ten] = chonNgauNhien(DEM_TEN);
    } while (tenDaDung.has(`${ho} ${dem} ${ten}`));
    tenDaDung.add(`${ho} ${dem} ${ten}`);
    const sdt = `0910000${String(i + 1).padStart(3, '0')}`;
    const nhomTuoi = chonCoTrongSo([[20, 38], [28, 30], [40, 14], [16, 8], [55, 5], [null, 5]]);
    let ngaySinh = null;
    if (nhomTuoi) {
      const tuoi = nhomTuoi + soNguyen(-3, 4);
      const nam = new Date().getFullYear() - tuoi;
      ngaySinh = `${nam}-${String(soNguyen(1, 12)).padStart(2, '0')}-${String(soNguyen(1, 28)).padStart(2, '0')}`;
    }
    // Đăng ký tập trung nhiều ở các tháng gần đây (tăng trưởng)
    const soNgayTruoc = Math.floor(Math.pow(rand(), 1.6) * 175);
    khachHang.push({
      hoTen: `${ho} ${dem} ${ten}`,
      sdt,
      ngaySinh,
      soThich: chonCoTrongSo(SO_THICH),
      ngayDangKy: ngayLui(soNgayTruoc),
      trangThai: i === 7 || i === 23 ? 'khoa' : 'hoat_dong',
      soNgayTruoc,
    });
  }

  const idKhach = [];
  for (const k of khachHang) {
    const [r] = await pool.query(
      `INSERT INTO khachhang (ho_ten, sdt, mat_khau, ngay_sinh, so_thich, trang_thai, ngay_dang_ky)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [k.hoTen, k.sdt, matKhauKhach, k.ngaySinh, k.soThich, k.trangThai, k.ngayDangKy]
    );
    idKhach.push(r.insertId);
  }

  // Ghi chú nội bộ cho vài khách
  await pool.query('UPDATE khachhang SET ghi_chu = ? WHERE id = ?', ['Khách quen, hay ngồi khu cửa sổ, thích ít đá.', idKhach[0]]);
  await pool.query('UPDATE khachhang SET ghi_chu = ? WHERE id = ?', ['Dị ứng sữa tươi — gợi ý sữa hạt khi order.', idKhach[3]]);
  await pool.query('UPDATE khachhang SET ghi_chu = ? WHERE id = ?', ['Đã nhắc nhở 2 lần về việc đánh giá sai sự thật.', idKhach[7]]);

  // ---------- 4. Phản hồi ----------
  let demPhanHoi = 0;
  for (let i = 0; i < PHAN_HOI_MAU.length; i++) {
    const [noiDung, traLoi] = PHAN_HOI_MAU[i];
    const khachIdx = soNguyen(0, idKhach.length - 1);
    const ngayGui = ngayLui(soNguyen(0, 20 + i));
    const dataTraLoi = traLoi
      ? [traLoi, new Date(Math.min(Date.now() - 60000, ngayGui.getTime() + soNguyen(2, 40) * 3600 * 1000)), chonNgauNhien(idNguoiTraLoi), 'da_xu_ly']
      : [null, null, null, i % 5 === 0 ? 'da_xu_ly' : 'cho_xu_ly'];
    await pool.query(
      `INSERT INTO phanhoi (khach_hang_id, noi_dung, ngay_gui, tra_loi, ngay_tra_loi, nguoi_tra_loi_id, trang_thai_xu_ly)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idKhach[khachIdx], noiDung, ngayGui, ...dataTraLoi]
    );
    demPhanHoi++;
  }

  // ---------- 5. Đánh giá sản phẩm + nhân viên ----------
  let demDgSp = 0;
  let demDgNv = 0;
  const diemNhanVien = [4.7, 4.2, 4.5];
  for (let i = 0; i < idKhach.length; i++) {
    if (khachHang[i].trangThai === 'khoa' && i === 23) continue;
    const soSp = soNguyen(0, 4);
    const daChon = new Set();
    for (let j = 0; j < soSp; j++) {
      const sp = chonNgauNhien(dsSanPhamId);
      if (daChon.has(sp)) continue;
      daChon.add(sp);
      const sao = Math.max(1, Math.min(5, Math.round(diemCoBan[sp] + (rand() - 0.5) * 2.2)));
      await pool.query(
        'INSERT INTO danhgiasanpham (khach_hang_id, san_pham_id, so_sao, nhan_xet, ngay_danh_gia) VALUES (?, ?, ?, ?, ?)',
        [idKhach[i], sp, sao, rand() < 0.45 ? chonNgauNhien(NHAN_XET_SP) : null, ngayLui(soNguyen(0, Math.max(1, khachHang[i].soNgayTruoc)))]
      );
      demDgSp++;
    }
    if (rand() < 0.5) {
      const nvIdx = soNguyen(0, 2);
      const sao = Math.max(1, Math.min(5, Math.round(diemNhanVien[nvIdx] + (rand() - 0.5) * 1.6)));
      await pool.query(
        'INSERT INTO danhgianhanvien (khach_hang_id, quan_ly_id, so_sao, nhan_xet, ngay_danh_gia) VALUES (?, ?, ?, ?, ?)',
        [idKhach[i], idNhanVien[nvIdx], sao, rand() < 0.5 ? chonNgauNhien(NHAN_XET_NV) : null, ngayLui(soNguyen(0, Math.max(1, khachHang[i].soNgayTruoc)))]
      );
      demDgNv++;
    }
  }

  // ---------- 6. Khảo sát ----------
  // 6a. Khảo sát có sẵn trong CSDL gốc (id 2): thêm câu trả lời cho nhiều khách
  const [[ksCu]] = await pool.query("SELECT id FROM khaosat WHERE id = 2");
  let demTraLoi = 0;
  if (ksCu) {
    const [cauHoiCu] = await pool.query('SELECT id, loai_cau_hoi FROM cauhoi WHERE khao_sat_id = 2 ORDER BY id');
    for (let i = 0; i < 26; i++) {
      for (const ch of cauHoiCu) {
        let dapAnId = null, giaTri = null, tuLuan = null;
        if (ch.loai_cau_hoi === 'trac_nghiem') {
          const [dapAn] = await pool.query('SELECT id FROM dapan WHERE cau_hoi_id = ? ORDER BY thu_tu', [ch.id]);
          dapAnId = dapAn.length ? chonCoTrongSo(dapAn.map((d, idx) => [d.id, [20, 14, 36, 30][idx] || 10])) : null;
        } else if (ch.loai_cau_hoi === 'thang_do') {
          giaTri = chonCoTrongSo([[5, 34], [4, 38], [3, 18], [2, 7], [1, 3]]);
        } else {
          tuLuan = chonNgauNhien(TRA_LOI_TU_LUAN);
        }
        await pool.query(
          `INSERT IGNORE INTO ketquakhaosat (cau_hoi_id, khach_hang_id, dap_an_id, cau_tra_loi, gia_tri_so, ngay_thuc_hien)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [ch.id, idKhach[i], dapAnId, tuLuan, giaTri, ngayLui(soNguyen(0, 25))]
        );
        demTraLoi++;
      }
    }
  }

  // 6b. Khảo sát mới về không gian quán (đang mở)
  const [kq1] = await pool.query(
    'INSERT INTO khaosat (quan_ly_id, tieu_de, mo_ta, ngay_tao, trang_thai) VALUES (?, ?, ?, ?, ?)',
    [admin.id, 'Trải nghiệm không gian quán', 'Giúp quán hiểu bạn thích không gian như thế nào (khoảng 1 phút).', ngayLui(6), 'dang_mo']
  );
  const ks1 = kq1.insertId;
  async function taoCauHoi(ksId, noiDung, loai, dapAn = []) {
    const [r] = await pool.query('INSERT INTO cauhoi (khao_sat_id, noi_dung_cau_hoi, loai_cau_hoi) VALUES (?, ?, ?)', [ksId, noiDung, loai]);
    const dapAnId = [];
    for (let i = 0; i < dapAn.length; i++) {
      const [d] = await pool.query('INSERT INTO dapan (cau_hoi_id, noi_dung, thu_tu) VALUES (?, ?, ?)', [r.insertId, dapAn[i], i + 1]);
      dapAnId.push(d.insertId);
    }
    return { id: r.insertId, loai, dapAnId };
  }
  const c1 = await taoCauHoi(ks1, 'Bạn thường ghé quán để làm gì?', 'trac_nghiem', ['Làm việc / học bài', 'Gặp gỡ bạn bè', 'Thư giãn một mình', 'Mua mang đi']);
  const c2 = await taoCauHoi(ks1, 'Bạn đánh giá độ thoải mái của không gian quán (1-5)?', 'thang_do');
  const c3 = await taoCauHoi(ks1, 'Mức độ ồn ào hiện tại của quán', 'trac_nghiem', ['Quá yên tĩnh', 'Vừa phải', 'Hơi ồn']);
  const c4 = await taoCauHoi(ks1, 'Bạn muốn quán bổ sung tiện ích nào?', 'tu_luan');
  for (let i = 10; i < 32; i++) {
    const ngay = ngayLui(soNguyen(0, 5));
    const dongMoi = [
      [c1.id, chonCoTrongSo(c1.dapAnId.map((id, idx) => [id, [38, 30, 20, 12][idx]])), null, null],
      [c2.id, null, chonCoTrongSo([[5, 26], [4, 42], [3, 22], [2, 8], [1, 2]]), null],
      [c3.id, chonCoTrongSo(c3.dapAnId.map((id, idx) => [id, [8, 66, 26][idx]])), null, null],
      [c4.id, null, null, chonNgauNhien(TRA_LOI_TU_LUAN)],
    ];
    for (const [cauId, dapAnId, giaTri, tuLuan] of dongMoi) {
      await pool.query(
        `INSERT IGNORE INTO ketquakhaosat (cau_hoi_id, khach_hang_id, dap_an_id, cau_tra_loi, gia_tri_so, ngay_thuc_hien)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cauId, idKhach[i], dapAnId, tuLuan, giaTri, ngay]
      );
      demTraLoi++;
    }
  }

  // 6c. Một khảo sát cũ đã đóng
  const [kq2] = await pool.query(
    'INSERT INTO khaosat (quan_ly_id, tieu_de, mo_ta, ngay_tao, trang_thai) VALUES (?, ?, ?, ?, ?)',
    [admin.id, 'Thăm dò món mới mùa hè', 'Khảo sát đã kết thúc.', ngayLui(70), 'da_dong']
  );
  const c5 = await taoCauHoi(kq2.insertId, 'Bạn muốn thử món mới nào nhất?', 'trac_nghiem', ['Cold brew cam', 'Trà vải', 'Sinh tố bơ', 'Matcha đá xay']);
  for (let i = 0; i < 14; i++) {
    await pool.query(
      `INSERT IGNORE INTO ketquakhaosat (cau_hoi_id, khach_hang_id, dap_an_id, ngay_thuc_hien) VALUES (?, ?, ?, ?)`,
      [c5.id, idKhach[i + 12], chonNgauNhien(c5.dapAnId), ngayLui(soNguyen(40, 66))]
    );
    demTraLoi++;
  }

  console.log('Nạp dữ liệu mẫu thành công:');
  console.log(`  - ${khachHang.length} khách hàng (mật khẩu: matkhau123), SĐT 0910000001 → 0910000042`);
  console.log(`  - ${nhanVienMau.length} tài khoản nhân viên/quản lý (mật khẩu: nhanvien123): ${nhanVienMau.map((n) => n[0]).join(', ')}`);
  console.log(`  - ${SAN_PHAM_THEM.length} sản phẩm mới`);
  console.log(`  - ${demPhanHoi} phản hồi, ${demDgSp} đánh giá sản phẩm, ${demDgNv} đánh giá nhân viên`);
  console.log(`  - 2 khảo sát mới + ${demTraLoi} câu trả lời khảo sát`);
}

main()
  .catch((err) => {
    console.error('Lỗi khi nạp dữ liệu mẫu:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
