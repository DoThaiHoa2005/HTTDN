// Chạy 1 lần để tạo tài khoản quản lý đầu tiên, vì hệ thống không có API
// đăng ký quản lý công khai (tài khoản quản lý không nên tự đăng ký được).
//
// Cách dùng (chạy trong thư mục gốc cafe-crm-backend):
//   node scripts/tao-tai-khoan-quan-ly.js <ten_dang_nhap> <mat_khau> [vai_tro]
//
// Ví dụ:
//   node scripts/tao-tai-khoan-quan-ly.js admin MatKhau123 admin

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function main() {
  const [tenDangNhap, matKhau, vaiTro = 'admin'] = process.argv.slice(2);

  if (!tenDangNhap || !matKhau) {
    console.log('Thiếu tham số.');
    console.log('Cách dùng: node scripts/tao-tai-khoan-quan-ly.js <ten_dang_nhap> <mat_khau> [vai_tro]');
    process.exit(1);
  }

  if (!['admin', 'quan_ly', 'nhan_vien'].includes(vaiTro)) {
    console.log("vai_tro phải là 'admin', 'quan_ly' hoặc 'nhan_vien'");
    process.exit(1);
  }

  try {
    const [existed] = await pool.query(
      'SELECT id FROM quanly WHERE ten_dang_nhap = ?',
      [tenDangNhap]
    );

    if (existed.length > 0) {
      console.log(`Tên đăng nhập "${tenDangNhap}" đã tồn tại, không tạo lại.`);
      process.exit(1);
    }

    const matKhauMaHoa = await bcrypt.hash(matKhau, 10);

    const [result] = await pool.query(
      'INSERT INTO quanly (ten_dang_nhap, mat_khau, vai_tro) VALUES (?, ?, ?)',
      [tenDangNhap, matKhauMaHoa, vaiTro]
    );

    console.log(`Tạo tài khoản quản lý thành công! id = ${result.insertId}, ten_dang_nhap = ${tenDangNhap}, vai_tro = ${vaiTro}`);
  } catch (err) {
    console.error('Lỗi khi tạo tài khoản quản lý:', err.message);
  } finally {
    await pool.end();
  }
}

main();
