require('dotenv').config();
const app = require('./src/app');
const { damBaoCauTruc } = require('./src/config/ensureSchema');

const PORT = process.env.PORT || 3000;

// Kiểm tra cấu hình bảo mật khi khởi động
if (!process.env.JWT_SECRET) {
  console.error('THIẾU JWT_SECRET trong biến môi trường (.env). Hãy đặt một chuỗi bí mật dài, ngẫu nhiên.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16 || /thay_bang|changeme|secret$/i.test(process.env.JWT_SECRET)) {
  console.warn('[CẢNH BÁO] JWT_SECRET quá ngắn hoặc là giá trị mẫu - ai cũng có thể giả mạo đăng nhập. Hãy đổi bằng: openssl rand -hex 32');
}

// Lỗi bất ngờ chỉ được ghi log, không làm sập server
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

async function khoiDong() {
  try {
    await damBaoCauTruc();
  } catch (err) {
    console.error('Không thể kiểm tra/cập nhật cấu trúc CSDL:', err.message);
    console.error('Hãy kiểm tra MySQL đã bật, đã import CSDL và thông tin trong file .env chưa.');
  }

  app.listen(PORT, () => {
    console.log(`Server dang chay tai http://localhost:${PORT}`);
  });
}

khoiDong();
