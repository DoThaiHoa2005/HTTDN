// Giới hạn số lần gọi để chống dò mật khẩu (brute force) và spam
const rateLimit = require('express-rate-limit');

function taoGioiHan({ phut, toiDa, thongBao }) {
  return rateLimit({
    windowMs: phut * 60 * 1000,
    limit: toiDa,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ message: thongBao }),
  });
}

// Đăng nhập: tối đa 10 lần / 15 phút / IP
const gioiHanDangNhap = taoGioiHan({ phut: 15, toiDa: 10, thongBao: 'Bạn đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' });
// Đăng ký: tối đa 10 lần / giờ / IP
const gioiHanDangKy = taoGioiHan({ phut: 60, toiDa: 10, thongBao: 'Bạn đăng ký quá nhiều lần, vui lòng thử lại sau' });
// Toàn bộ API: tối đa 1000 lần / 15 phút / IP
const gioiHanChung = taoGioiHan({ phut: 15, toiDa: 1000, thongBao: 'Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút' });

module.exports = { gioiHanDangNhap, gioiHanDangKy, gioiHanChung };
