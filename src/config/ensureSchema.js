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
}

module.exports = { damBaoCauTruc };
