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

// Cho phép truy cập ảnh đã upload qua URL tĩnh, vd: /uploads/san-pham/xxx.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/phan-hoi', feedbackRoutes);
app.use('/api/khao-sat', surveyRoutes);
app.use('/api/quan-ly', managerRoutes);
app.use('/api/san-pham', productPublicRoutes);
app.use('/api/danh-gia', reviewRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Cafe CRM API dang chay' });
});

// Đường dẫn /api/... không tồn tại => trả JSON thay vì trang HTML mặc định của Express
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Không tìm thấy API này' });
});

// Middleware xử lý lỗi chung, đặt cuối cùng
app.use((err, req, res, next) => {
  // JSON gửi lên bị sai cú pháp
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Đã xảy ra lỗi không mong muốn' });
});
const path = require('path');

// 1. Chỉ định Node.js đọc các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// 2. Chuyển hướng mọi đường dẫn giao diện (F5 không bị lỗi 404)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
