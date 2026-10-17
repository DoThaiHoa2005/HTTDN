-- =====================================================
-- MIGRATION: Thêm vai trò "quan_ly" (Quản lý) vào bảng quanly
-- Phân quyền 3 cấp: admin > quan_ly > nhan_vien
--   - admin: toàn quyền, tạo QR sản phẩm + QR nhân viên
--   - quan_ly: chỉ tạo/xem QR nhân viên (không quản lý sản phẩm/tài khoản)
--   - nhan_vien: chỉ xem/nhận QR đã có sẵn (QR của chính mình + QR sản phẩm)
-- Chạy sau migration_them_danh_gia.sql
-- =====================================================

USE cafe_crm;

ALTER TABLE quanly
  MODIFY COLUMN vai_tro ENUM('admin', 'quan_ly', 'nhan_vien') NOT NULL DEFAULT 'nhan_vien';
