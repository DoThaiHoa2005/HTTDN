// Tự động bổ sung các cột mới (nếu chưa có) mỗi lần khởi động server.
// Nhờ vậy khi nâng cấp từ phiên bản cũ, không cần nhớ chạy tay file migration.
// (File migration_nang_cap_crm.sql vẫn được cung cấp để chạy thủ công/ làm tài liệu.)
const pool = require('./db');

async function coCot(bang, cot) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [bang, cot]
  );
  return rows.length > 0;
}

async function coBang(bang) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [bang]
  );
  return rows.length > 0;
}

async function themChiMucNeuThieu(bang, tenChiMuc, cacCot) {
  if (!(await coBang(bang))) return;
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [bang, tenChiMuc]
  );
  if (rows.length > 0) return;
  const dsCot = cacCot.map((c) => `\`${c}\``).join(', ');
  await pool.query(`ALTER TABLE \`${bang}\` ADD INDEX \`${tenChiMuc}\` (${dsCot})`);
  console.log(`[schema] Đã thêm chỉ mục ${bang}.${tenChiMuc}`);
}

async function themCotNeuThieu(bang, cot, dinhNghia) {
  if (!(await coBang(bang))) return;
  if (await coCot(bang, cot)) return;
  await pool.query(`ALTER TABLE \`${bang}\` ADD COLUMN \`${cot}\` ${dinhNghia}`);
  console.log(`[schema] Đã thêm cột ${bang}.${cot}`);
}

async function damBaoCauTruc() {
  // Phản hồi: quản lý có thể trả lời lại khách hàng
  await themCotNeuThieu('phanhoi', 'tra_loi', 'TEXT NULL');
  await themCotNeuThieu('phanhoi', 'ngay_tra_loi', 'DATETIME NULL');
  await themCotNeuThieu('phanhoi', 'nguoi_tra_loi_id', 'INT UNSIGNED NULL');

  // Khảo sát: đóng/mở khảo sát (chỉ khảo sát đang mở mới hiện cho khách làm)
  await themCotNeuThieu('khaosat', 'trang_thai', "ENUM('dang_mo','da_dong') NOT NULL DEFAULT 'dang_mo'");

  // Khách hàng: ghi chú nội bộ của quán (khách không nhìn thấy)
  await themCotNeuThieu('khachhang', 'ghi_chu', 'TEXT NULL');

  // Khóa/mở khóa tài khoản nhân sự (quản lý, nhân viên, admin)
  await themCotNeuThieu('quanly', 'trang_thai', "ENUM('hoat_dong','khoa') NOT NULL DEFAULT 'hoat_dong'");

  // Chỉ mục (index) cho các cột hay dùng để lọc, sắp xếp, thống kê
  await themChiMucNeuThieu('phanhoi', 'idx_phanhoi_trangthai_ngay', ['trang_thai_xu_ly', 'ngay_gui']);
  await themChiMucNeuThieu('khachhang', 'idx_khachhang_ngay_dang_ky', ['ngay_dang_ky']);
  await themChiMucNeuThieu('khachhang', 'idx_khachhang_trang_thai', ['trang_thai']);
  await themChiMucNeuThieu('sanpham', 'idx_sanpham_trang_thai', ['trang_thai']);
  await themChiMucNeuThieu('danhgiasanpham', 'idx_dgsp_sp_ngay', ['san_pham_id', 'ngay_danh_gia']);
  await themChiMucNeuThieu('danhgianhanvien', 'idx_dgnv_nv_ngay', ['quan_ly_id', 'ngay_danh_gia']);
  await themChiMucNeuThieu('ketquakhaosat', 'idx_ketqua_ngay', ['ngay_thuc_hien']);
  await themChiMucNeuThieu('khaosat', 'idx_khaosat_trangthai_ngay', ['trang_thai', 'ngay_tao']);
  await themChiMucNeuThieu('quanly', 'idx_quanly_vaitro_trangthai', ['vai_tro', 'trang_thai']);

  // Sửa dấu tiếng Việt cho dữ liệu khảo sát mẫu (lỗi nhỏ không được làm server không khởi động được)
  try {
    await suaDauKhaoSatMau();
  } catch (err) {
    console.error('[schema] Không sửa được dấu khảo sát mẫu:', err.message);
  }
}

// Dữ liệu mẫu trong CSDL gốc bị viết không dấu => đổi sang tiếng Việt có dấu đầy đủ.
// Chỉ đổi khi nội dung đang đúng bằng bản không dấu cũ, nên không ghi đè nội dung quản lý tự sửa.
async function suaDauKhaoSatMau() {
  const doiTieuDe = [
    ['Khao sat hai long thang 10', 'Khảo sát hài lòng tháng 10'],
  ];
  const doiMoTa = [
    ['Khao sat nhanh sau khi dung ca phe', 'Khảo sát nhanh sau khi dùng cà phê'],
  ];
  const doiCauHoi = [
    ['Ban thuong ghe quan vao khung gio nao?', 'Bạn thường ghé quán vào khung giờ nào?'],
    ['Ban hai long voi chat luong do uong o muc nao (1-5)?', 'Bạn hài lòng với chất lượng đồ uống ở mức nào (1-5)?'],
    ['Ban muon quan cai thien dieu gi?', 'Bạn muốn quán cải thiện điều gì?'],
  ];
  const doiDapAn = [['Sang', 'Sáng'], ['Trua', 'Trưa'], ['Chieu', 'Chiều'], ['Toi', 'Tối']];

  let soDong = 0;
  if (await coBang('khaosat')) {
    for (const [cu, moi] of doiTieuDe) soDong += (await pool.query('UPDATE khaosat SET tieu_de = ? WHERE BINARY tieu_de = ?', [moi, cu]))[0].affectedRows;
    for (const [cu, moi] of doiMoTa) soDong += (await pool.query('UPDATE khaosat SET mo_ta = ? WHERE BINARY mo_ta = ?', [moi, cu]))[0].affectedRows;
  }
  if (await coBang('cauhoi')) {
    for (const [cu, moi] of doiCauHoi) soDong += (await pool.query('UPDATE cauhoi SET noi_dung_cau_hoi = ? WHERE BINARY noi_dung_cau_hoi = ?', [moi, cu]))[0].affectedRows;
  }
  // Đáp án chỉ đổi cho câu "khung giờ" (tránh đụng đáp án khác cũng tên "Sang"...)
  if ((await coBang('dapan')) && (await coBang('cauhoi'))) {
    for (const [cu, moi] of doiDapAn) {
      soDong += (await pool.query(
        `UPDATE dapan d JOIN cauhoi c ON c.id = d.cau_hoi_id
         SET d.noi_dung = ?
         WHERE BINARY d.noi_dung = ? AND c.noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?'`,
        [moi, cu]
      ))[0].affectedRows;
    }
  }
  // Dữ liệu mẫu khác của CSDL gốc (khách hàng, quản lý, phản hồi) cũng bị viết không dấu
  if (await coBang('khachhang')) {
    soDong += (await pool.query("UPDATE khachhang SET ho_ten = 'Nguyễn Văn A (đã sửa)' WHERE BINARY ho_ten = 'Nguyen Van A (da sua)'"))[0].affectedRows;
    soDong += (await pool.query("UPDATE khachhang SET ho_ten = 'Trần Thị B' WHERE BINARY ho_ten = 'Tran Thi B'"))[0].affectedRows;
    soDong += (await pool.query("UPDATE khachhang SET so_thich = 'trà sữa' WHERE BINARY so_thich = 'tra sua'"))[0].affectedRows;
  }
  if (await coBang('quanly')) {
    soDong += (await pool.query("UPDATE quanly SET ho_ten = 'Quản lý' WHERE BINARY ho_ten = 'quan ly'"))[0].affectedRows;
  }
  if (await coBang('phanhoi')) {
    soDong += (await pool.query("UPDATE phanhoi SET noi_dung = 'Cafe rất ngon nhưng hơi lâu' WHERE BINARY noi_dung = 'Cafe rat ngon nhung hoi lau ban'"))[0].affectedRows;
  }
  if (soDong > 0) console.log(`[schema] Đã sửa dấu tiếng Việt cho ${soDong} dòng dữ liệu mẫu`);
}

module.exports = { damBaoCauTruc, suaDauKhaoSatMau };
