-- ============================================================
-- Migration: NÂNG CẤP CRM (trả lời phản hồi, đóng/mở khảo sát, ghi chú khách hàng)
-- Chạy SAU khi đã import db/cafe_crm.sql và các migration trước.
--
-- LƯU Ý: backend (server.js) đã TỰ ĐỘNG thêm các cột này khi khởi động,
-- nên thường không cần chạy file này. File được giữ lại để:
--   (1) làm tài liệu mô tả thay đổi CSDL cho báo cáo đồ án,
--   (2) chạy thủ công nếu muốn.
-- Cú pháp "ADD COLUMN IF NOT EXISTS" chạy được trên MariaDB (XAMPP).
-- Nếu dùng MySQL 8 thì bỏ "IF NOT EXISTS" (chỉ chạy 1 lần).
-- ============================================================

-- 1) Phản hồi: quản lý trả lời lại khách hàng
ALTER TABLE phanhoi
  ADD COLUMN IF NOT EXISTS tra_loi TEXT NULL,
  ADD COLUMN IF NOT EXISTS ngay_tra_loi DATETIME NULL,
  ADD COLUMN IF NOT EXISTS nguoi_tra_loi_id INT UNSIGNED NULL;

-- 2) Khảo sát: đóng/mở khảo sát (khách chỉ làm được khảo sát đang mở)
ALTER TABLE khaosat
  ADD COLUMN IF NOT EXISTS trang_thai ENUM('dang_mo','da_dong') NOT NULL DEFAULT 'dang_mo';

-- 3) Khách hàng: ghi chú nội bộ của quán (khách không nhìn thấy)
ALTER TABLE khachhang
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT NULL;
