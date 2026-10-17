require('dotenv').config();
const app = require('./src/app');
const { damBaoCauTruc } = require('./src/config/ensureSchema');

const PORT = process.env.PORT || 3000;

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
