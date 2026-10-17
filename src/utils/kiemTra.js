// Các hàm kiểm tra / chuẩn hóa dữ liệu đầu vào dùng chung cho nhiều controller

// Chuẩn hóa số điện thoại: bỏ khoảng trắng, dấu chấm, gạch ngang; đổi +84/84 thành 0
function chuanHoaSdt(sdt) {
  let s = String(sdt || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return s;
}

// SĐT Việt Nam: 10 chữ số, bắt đầu bằng 0
function sdtHopLe(sdt) {
  return /^0\d{9}$/.test(sdt);
}

const DO_DAI_MAT_KHAU_TOI_THIEU = 6;
const DO_DAI_MAT_KHAU_TOI_DA = 64;

// Trả về chuỗi thông báo lỗi nếu mật khẩu không hợp lệ, ngược lại trả về null
function kiemTraMatKhau(matKhau) {
  if (typeof matKhau !== 'string' || matKhau.length < DO_DAI_MAT_KHAU_TOI_THIEU) {
    return `Mật khẩu phải có ít nhất ${DO_DAI_MAT_KHAU_TOI_THIEU} ký tự`;
  }
  if (matKhau.length > DO_DAI_MAT_KHAU_TOI_DA) {
    return `Mật khẩu không được dài quá ${DO_DAI_MAT_KHAU_TOI_DA} ký tự`;
  }
  return null;
}

// Ngày sinh hợp lệ: đúng định dạng YYYY-MM-DD, không ở tương lai, không quá 120 tuổi
function kiemTraNgaySinh(ngaySinh) {
  if (!ngaySinh) return null; // không bắt buộc
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngaySinh)) return 'Ngày sinh không đúng định dạng';
  const d = new Date(ngaySinh);
  if (Number.isNaN(d.getTime())) return 'Ngày sinh không hợp lệ';
  const nay = new Date();
  if (d > nay) return 'Ngày sinh không được ở tương lai';
  if (nay.getFullYear() - d.getFullYear() > 120) return 'Ngày sinh không hợp lệ';
  return null;
}

module.exports = {
  chuanHoaSdt,
  sdtHopLe,
  kiemTraMatKhau,
  kiemTraNgaySinh,
  DO_DAI_MAT_KHAU_TOI_THIEU,
};
