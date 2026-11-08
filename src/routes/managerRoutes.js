const express = require('express');
const { kiemTraIdThamSo } = require('../utils/kiemTra');
const {
  xuatKhachHang, xuatPhanHoi, xuatBaoCaoKhachHang, xuatKhaoSat, xuatDanhGia, xuatSanPham, xuatTaiKhoan,
} = require('../controllers/exportController');
const router = express.Router();
const { xacThucQuanLy } = require('../middleware/authQuanLy');
const { chiAdmin } = require('../middleware/chiAdmin');
const { chiAdminHoacQuanLy } = require('../middleware/chiAdminHoacQuanLy');
const { upload } = require('../middleware/uploadAnh');

const { dangNhapQuanLy, thongTinCuaToi, doiMatKhauQuanLy } = require('../controllers/managerAuthController');
const { tongQuan } = require('../controllers/dashboardController');
const {
  danhSachKhachHang,
  chiTietKhachHang,
  themKhachHang,
  suaKhachHang,
  doiTrangThaiKhachHang,
  baoCaoKhachHang,
} = require('../controllers/customerAdminController');
const {
  danhSachPhanHoi,
  capNhatTrangThaiPhanHoi,
} = require('../controllers/feedbackAdminController');
const {
  taoKhaoSat,
  danhSachKhaoSat,
  thongKeKhaoSat,
  doiTrangThaiKhaoSat,
  xoaKhaoSat,
} = require('../controllers/surveyAdminController');
const {
  danhSachSanPham,
  danhSachDanhMuc,
  themSanPham,
  suaSanPham,
  xoaSanPham,
  uploadAnhSanPham,
} = require('../controllers/productAdminController');
const {
  danhSachTaiKhoan,
  doiTrangThaiTaiKhoan,
  themTaiKhoan,
  phanQuyenTaiKhoan,
  suaHoTenTaiKhoan,
  datLaiMatKhauTaiKhoan,
} = require('../controllers/accountAdminController');
const {
  danhGiaSanPham,
  nhanXetSanPham,
  danhGiaNhanVien,
  nhanXetNhanVien,
} = require('../controllers/reviewAdminController');

router.param('id', kiemTraIdThamSo); // mọi :id phải là số nguyên dương

// Đăng nhập - không cần token
router.post('/dang-nhap', dangNhapQuanLy);

// Từ đây trở xuống, mọi route đều bắt buộc token quản lý
router.use(xacThucQuanLy);

// ===== Dành cho MỌI vai trò (kể cả nhân viên): xem/đổi thông tin tài khoản của chính mình =====
router.get('/toi', thongTinCuaToi);
router.put('/doi-mat-khau', doiMatKhauQuanLy);

// ===== Khu vực nghiệp vụ CRM - chỉ admin và quản lý; nhân viên KHÔNG truy cập =====
router.use(chiAdminHoacQuanLy);

// Tổng quan (dashboard)
router.get('/tong-quan', tongQuan);

// Quản lý khách hàng (lưu ý: route tĩnh /bao-cao phải đứng trước route động /:id)
router.get('/khach-hang', danhSachKhachHang);
router.post('/khach-hang', themKhachHang);
// Xuất Excel khách hàng (đặt trước '/khach-hang/:id' để không bị nhầm thành id)
router.get('/khach-hang/xuat-excel', xuatKhachHang);
router.get('/khach-hang/bao-cao/xuat-excel', xuatBaoCaoKhachHang);
router.get('/khach-hang/bao-cao', baoCaoKhachHang);
router.get('/khach-hang/:id', chiTietKhachHang);
router.put('/khach-hang/:id', suaKhachHang);
// Không cho xóa khách hàng (giữ lịch sử phản hồi, đánh giá, khảo sát): chỉ khóa hoặc sửa
router.delete('/khach-hang/:id', (req, res) => {
  res.status(405).set('Allow', 'GET, PUT, PATCH').json({ message: 'Hệ thống không cho xóa khách hàng. Hãy khóa tài khoản (PATCH /khach-hang/:id/trang-thai) hoặc sửa thông tin.' });
});
router.patch('/khach-hang/:id/trang-thai', doiTrangThaiKhachHang);

// Xuất Excel (.xlsx) — dùng lại bộ lọc của trang danh sách, xuất toàn bộ kết quả
router.get('/phan-hoi/xuat-excel', xuatPhanHoi);
router.get('/khao-sat/:id/xuat-excel', xuatKhaoSat);
router.get('/danh-gia/xuat-excel', xuatDanhGia);

// Tiếp nhận & trả lời phản hồi
router.get('/phan-hoi', danhSachPhanHoi);
router.patch('/phan-hoi/:id', capNhatTrangThaiPhanHoi);

// Khảo sát
router.post('/khao-sat', taoKhaoSat);
router.get('/khao-sat', danhSachKhaoSat);
router.get('/khao-sat/:id/thong-ke', thongKeKhaoSat);
router.patch('/khao-sat/:id/trang-thai', doiTrangThaiKhaoSat);
router.delete('/khao-sat/:id', xoaKhaoSat);

// Đánh giá sản phẩm & nhân viên (xem tổng hợp)
router.get('/danh-gia/san-pham', danhGiaSanPham);
router.get('/danh-gia/san-pham/:id/nhan-xet', nhanXetSanPham);
router.get('/danh-gia/nhan-vien', danhGiaNhanVien);
router.get('/danh-gia/nhan-vien/:id/nhan-xet', nhanXetNhanVien);

// ===== Khu vực ADMIN - tách biệt, chỉ vai_tro = 'admin' mới truy cập được =====

// Quản lý sản phẩm (thực đơn)
router.get('/san-pham/xuat-excel', chiAdmin, xuatSanPham);
router.get('/san-pham', chiAdmin, danhSachSanPham);
router.get('/san-pham/danh-muc', chiAdmin, danhSachDanhMuc);
router.post('/san-pham', chiAdmin, themSanPham);
router.put('/san-pham/:id', chiAdmin, suaSanPham);
router.delete('/san-pham/:id', chiAdmin, xoaSanPham);
router.post('/san-pham/upload-anh', chiAdmin, (req, res, next) => {
  upload.single('anh')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh quá lớn, tối đa 5MB' : err.message;
      return res.status(400).json({ message });
    }
    next();
  });
}, uploadAnhSanPham);

// Quản lý tài khoản & phân quyền
// GET nới cho cả 'quan_ly' để họ xem danh sách và tạo QR cho nhân viên;
// thêm/sửa/xóa/phân quyền/đặt lại mật khẩu vẫn chỉ 'admin'
router.get('/tai-khoan/xuat-excel', chiAdmin, xuatTaiKhoan);
router.get('/tai-khoan', chiAdminHoacQuanLy, danhSachTaiKhoan);
router.post('/tai-khoan', chiAdmin, themTaiKhoan);
router.patch('/tai-khoan/:id/vai-tro', chiAdmin, phanQuyenTaiKhoan);
router.patch('/tai-khoan/:id/trang-thai', chiAdmin, doiTrangThaiTaiKhoan);
router.patch('/tai-khoan/:id/ho-ten', chiAdmin, suaHoTenTaiKhoan);
router.patch('/tai-khoan/:id/mat-khau', chiAdmin, datLaiMatKhauTaiKhoan);
// Không cho xóa tài khoản (giữ nguyên lịch sử đánh giá/phản hồi liên quan): chỉ khóa hoặc sửa
router.delete('/tai-khoan/:id', chiAdmin, (req, res) => {
  res.status(405).set('Allow', 'GET, PATCH').json({ message: 'Hệ thống không cho xóa tài khoản. Hãy khóa tài khoản (PATCH /tai-khoan/:id/trang-thai) hoặc sửa thông tin.' });
});

module.exports = router;
