require('express-async-errors'); // lỗi trong hàm async được chuyển về middleware xử lý lỗi thay vì làm sập server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const managerRoutes = require('./routes/managerRoutes');
const productPublicRoutes = require('./routes/productPublicRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const { xuLyLoi, khongTimThay } = require('./middleware/xuLyLoi');
const { gioiHanDangNhap, gioiHanDangKy, gioiHanChung } = require('./middleware/gioiHan');

const app = express();

// Render/Heroku... chạy sau reverse proxy => cần để lấy đúng IP người dùng cho bộ giới hạn tần suất
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Header bảo mật (chống XSS, clickjacking, sniff MIME...). Ảnh cho phép từ cùng domain, https và data:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: đặt CORS_ORIGIN (vd: https://ten-app.onrender.com, nhiều giá trị cách nhau dấu phẩy) để chỉ cho phép các domain đó.
// Khi frontend và backend cùng domain (cách triển khai hiện tại) thì không cần đặt.
const nguonChoPhep = (process.env.CORS_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean);
app.use(cors(nguonChoPhep.length ? { origin: nguonChoPhep } : undefined));

app.use(express.json({ limit: '100kb' }));

// 1. Cho phép truy cập ảnh đã upload qua URL tĩnh, vd: /uploads/san-pham/xxx.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Khai báo các đường dẫn API
app.use('/api', gioiHanChung);
app.use('/api/auth/dang-nhap', gioiHanDangNhap);
app.use('/api/quan-ly/dang-nhap', gioiHanDangNhap);
app.use('/api/auth/dang-ky', gioiHanDangKy);
app.use('/api/auth', authRoutes);
app.use('/api/phan-hoi', feedbackRoutes);
app.use('/api/khao-sat', surveyRoutes);
app.use('/api/quan-ly', managerRoutes);
app.use('/api/san-pham', productPublicRoutes);
app.use('/api/danh-gia', reviewRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'Cafe CRM API dang chay' });
});

// Đường dẫn /api/... không tồn tại => trả JSON thay vì trang HTML mặc định của Express
app.use('/api', khongTimThay);

// 3. Khai báo phục vụ giao diện Frontend đã build (Thư mục public nằm ở gốc backend, tức là đi lùi 1 cấp từ src)
app.use(express.static(path.join(__dirname, '../public')));

// Chuyển hướng mọi đường dẫn giao diện còn lại về index.html của React (F5 không bị lỗi 404)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 4. Middleware xử lý lỗi tập trung, đặt ở cuối cùng
app.use(xuLyLoi);

module.exports = app;