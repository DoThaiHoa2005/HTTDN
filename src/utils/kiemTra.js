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

// Kiểm tra một trường chữ: đúng kiểu (chuỗi), không rỗng nếu bắt buộc, không quá dài.
// Trả về chuỗi lỗi hoặc null. Chặn các kiểu dữ liệu lạ (số, mảng, object) mà client độc hại có thể gửi.
function kiemTraChuoi(giaTri, { ten, toiDa, batBuoc = false }) {
  if (giaTri === undefined || giaTri === null || giaTri === '') {
    return batBuoc ? `${ten} không được để trống` : null;
  }
  if (typeof giaTri !== 'string') return `${ten} không hợp lệ`;
  if (batBuoc && !giaTri.trim()) return `${ten} không được để trống`;
  if (giaTri.trim().length > toiDa) return `${ten} không được dài quá ${toiDa} ký tự`;
  return null;
}

// Địa chỉ ảnh sản phẩm: chỉ chấp nhận đường dẫn upload nội bộ hoặc URL http(s) (chặn javascript:, data: ...)
function kiemTraUrlAnh(url) {
  if (url === undefined || url === null || url === '') return null;
  if (typeof url !== 'string' || url.length > 255) return 'Địa chỉ ảnh không hợp lệ hoặc quá dài (tối đa 255 ký tự)';
  const hopLe = (url.startsWith('/uploads/') && !url.includes('..')) || /^https?:\/\/[^\s<>"']+$/i.test(url);
  return hopLe ? null : 'Địa chỉ ảnh phải là đường dẫn tải lên hoặc link bắt đầu bằng http:// hoặc https://';
}

// Chuẩn bị từ khóa cho LIKE: cắt độ dài và escape ký tự đặc biệt % _ \
function likeChuoi(tuKhoa) {
  const s = String(tuKhoa || '').trim().slice(0, 100).replace(/[\\%_]/g, '\\$&');
  return `%${s}%`;
}

// Dùng với router.param('id', kiemTraIdThamSo): id trên đường dẫn phải là số nguyên dương
function kiemTraIdThamSo(req, res, next, giaTri) {
  if (!/^\d{1,10}$/.test(giaTri) || Number(giaTri) < 1) {
    return res.status(400).json({ message: 'Mã (id) không hợp lệ' });
  }
  next();
}

module.exports = {
  kiemTraChuoi,
  kiemTraUrlAnh,
  likeChuoi,
  kiemTraIdThamSo,
  chuanHoaSdt,
  sdtHopLe,
  kiemTraMatKhau,
  kiemTraNgaySinh,
  DO_DAI_MAT_KHAU_TOI_THIEU,
};
