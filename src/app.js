const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const managerRoutes = require('./routes/managerRoutes');
const productPublicRoutes = require('./routes/productPublicRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Cho phép truy cập ảnh đã upload qua URL tĩnh, vd: /uploads/san-pham/xxx.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Khai báo các đường dẫn API
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
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Không tìm thấy API này' });
});

// 3. Khai báo phục vụ giao diện Frontend đã build (Thư mục public nằm ở gốc backend, tức là đi lùi 1 cấp từ src)
app.use(express.static(path.join(__dirname, '../public')));

// Chuyển hướng mọi đường dẫn giao diện còn lại về index.html của React (F5 không bị lỗi 404)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 4. Middleware xử lý lỗi chung, đặt ở cuối cùng
app.use((err, req, res, next) => {
  // JSON gửi lên bị sai cú pháp
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Đã xảy ra lỗi không mong muốn' });
});

module.exports = app;