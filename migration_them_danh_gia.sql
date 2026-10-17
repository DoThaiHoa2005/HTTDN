-- =====================================================
-- MIGRATION: Thêm chức năng đánh giá sản phẩm & đánh giá nhân viên
-- Chạy sau khi đã import db/cafe_crm.sql và migration_them_bang_sanpham.sql (qua phpMyAdmin của XAMPP).
-- LƯU Ý: db/cafe_crm.sql mới đã gồm sẵn các bảng/cột này, chỉ chạy file này khi CSDL cũ chưa có.
-- =====================================================

USE cafe_crm;

-- Thêm họ tên hiển thị cho tài khoản quản lý/nhân viên (để khách hàng thấy tên thật thay vì tên đăng nhập)
ALTER TABLE quanly ADD COLUMN ho_ten VARCHAR(100) NULL AFTER ten_dang_nhap;

-- Đánh giá sản phẩm (khách hàng đánh giá từng món trong thực đơn)
CREATE TABLE IF NOT EXISTS danhgiasanpham (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id   INT UNSIGNED NOT NULL,
  san_pham_id     INT UNSIGNED NOT NULL,
  so_sao          TINYINT UNSIGNED NOT NULL,
  nhan_xet        TEXT NULL,
  ngay_danh_gia   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dgsp_so_sao CHECK (so_sao BETWEEN 1 AND 5),
  CONSTRAINT fk_dgsp_khachhang FOREIGN KEY (khach_hang_id) REFERENCES khachhang(id) ON DELETE CASCADE,
  CONSTRAINT fk_dgsp_sanpham FOREIGN KEY (san_pham_id) REFERENCES sanpham(id) ON DELETE CASCADE,
  -- Mỗi khách chỉ đánh giá 1 sản phẩm 1 lần (đánh giá lại sẽ ghi đè)
  UNIQUE KEY uq_dgsp_khach_sanpham (khach_hang_id, san_pham_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Đánh giá nhân viên (khách hàng đánh giá chất lượng phục vụ của nhân viên/quản lý)
CREATE TABLE IF NOT EXISTS danhgianhanvien (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id   INT UNSIGNED NOT NULL,
  quan_ly_id      INT UNSIGNED NOT NULL,
  so_sao          TINYINT UNSIGNED NOT NULL,
  nhan_xet        TEXT NULL,
  ngay_danh_gia   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dgnv_so_sao CHECK (so_sao BETWEEN 1 AND 5),
  CONSTRAINT fk_dgnv_khachhang FOREIGN KEY (khach_hang_id) REFERENCES khachhang(id) ON DELETE CASCADE,
  CONSTRAINT fk_dgnv_quanly FOREIGN KEY (quan_ly_id) REFERENCES quanly(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dgnv_khach_nhanvien (khach_hang_id, quan_ly_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dữ liệu mẫu: đặt tên hiển thị cho tài khoản admin đã tạo trước đó (tùy chỉnh lại nếu cần)
UPDATE quanly SET ho_ten = 'Chủ quán' WHERE ten_dang_nhap = 'admin' AND ho_ten IS NULL;
