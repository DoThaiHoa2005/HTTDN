// Xử lý lỗi tập trung: mọi lỗi (kể cả lỗi trong hàm async) đều về đây và trả JSON có mã HTTP chuẩn.
// Ở môi trường production KHÔNG trả stack trace hay chi tiết nội bộ ra ngoài.
const LA_PRODUCTION = process.env.NODE_ENV === 'production';

const THONG_BAO_THEO_MA = {
  400: 'Dữ liệu gửi lên không hợp lệ',
  401: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu yêu cầu',
  409: 'Dữ liệu bị trùng hoặc xung đột',
  413: 'Dữ liệu gửi lên quá lớn',
  429: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  500: 'Đã xảy ra lỗi máy chủ, vui lòng thử lại sau',
};

function layMaLoi(err) {
  if (err.type === 'entity.parse.failed') return 400;
  if (err.type === 'entity.too.large') return 413;
  if (err.name === 'MulterError') return 400;
  const ma = err.status || err.statusCode;
  if (Number.isInteger(ma) && ma >= 400 && ma < 600) return ma;
  // Lỗi cơ sở dữ liệu thường gặp do dữ liệu người dùng gửi lên
  if (err.code === 'ER_DUP_ENTRY') return 409;
  if (['ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_BAD_NULL_ERROR', 'ER_NO_REFERENCED_ROW_2'].includes(err.code)) return 400;
  return 500;
}

function xuLyLoi(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);
  const ma = layMaLoi(err);

  let message = THONG_BAO_THEO_MA[ma] || THONG_BAO_THEO_MA[500];
  if (err.type === 'entity.parse.failed') message = 'Dữ liệu gửi lên không đúng định dạng JSON';
  else if (err.code === 'LIMIT_FILE_SIZE') message = 'Ảnh quá lớn, tối đa 5MB';
  else if (err.name === 'MulterError') message = 'File tải lên không hợp lệ';
  else if (ma < 500 && err.expose && err.message) message = err.message;

  if (ma >= 500) console.error(`[LỖI] ${req.method} ${req.originalUrl}`, err);

  const body = { message };
  if (!LA_PRODUCTION && ma >= 500) body.chi_tiet = err.message; // chỉ khi chạy máy cá nhân
  return res.status(ma).json(body);
}

function khongTimThay(req, res) {
  res.status(404).json({ message: 'Không tìm thấy API này' });
}

module.exports = { xuLyLoi, khongTimThay };
