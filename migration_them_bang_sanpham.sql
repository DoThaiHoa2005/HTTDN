-- =====================================================
-- MIGRATION: Thêm bảng sản phẩm (thực đơn đồ uống) phục vụ Giao diện ADMIN (mục II.2 đề bài)
-- Chạy sau khi đã import db/cafe_crm.sql (qua phpMyAdmin của XAMPP).
-- LƯU Ý: db/cafe_crm.sql mới đã gồm sẵn bảng này, chỉ chạy file này khi CSDL cũ chưa có.
-- =====================================================

USE cafe_crm;

CREATE TABLE IF NOT EXISTS sanpham (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ten_san_pham    VARCHAR(150) NOT NULL,
  mo_ta           TEXT NULL,
  danh_muc        VARCHAR(100) NULL COMMENT 'Vd: Cà phê, Trà, Nước ép, Bánh',
  gia             DECIMAL(10,2) NOT NULL,
  hinh_anh        VARCHAR(255) NULL COMMENT 'URL hoặc đường dẫn ảnh sản phẩm',
  trang_thai      ENUM('dang_ban', 'ngung_ban') NOT NULL DEFAULT 'dang_ban',
  ngay_tao        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sanpham_danh_muc (danh_muc)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dữ liệu mẫu để demo tìm kiếm/lọc/sắp xếp
INSERT INTO sanpham (ten_san_pham, mo_ta, danh_muc, gia, hinh_anh, trang_thai) VALUES
  ('Cà phê đen', 'Cà phê phin truyền thống', 'Cà phê', 25000, NULL, 'dang_ban'),
  ('Cà phê sữa', 'Cà phê phin kèm sữa đặc', 'Cà phê', 29000, NULL, 'dang_ban'),
  ('Bạc xỉu', 'Cà phê sữa nhiều sữa ít cà phê', 'Cà phê', 32000, NULL, 'dang_ban'),
  ('Trà đào cam sả', 'Trà trái cây giải khát', 'Trà', 35000, NULL, 'dang_ban'),
  ('Trà sữa trân châu', 'Trà sữa truyền thống', 'Trà', 30000, NULL, 'dang_ban'),
  ('Bánh croissant', 'Bánh sừng bò bơ Pháp', 'Bánh', 28000, NULL, 'dang_ban'),
  ('Nước ép cam', 'Cam vắt nguyên chất', 'Nước ép', 25000, NULL, 'ngung_ban');
