-- Sửa dấu tiếng Việt cho dữ liệu mẫu (khảo sát, khách hàng, quản lý, phản hồi) (chạy trong phpMyAdmin > tab SQL)
-- Server cũng tự chạy việc này khi khởi động, file này chỉ dùng khi muốn sửa ngay.
SET NAMES utf8mb4;

UPDATE khaosat SET tieu_de = 'Khảo sát hài lòng tháng 10' WHERE BINARY tieu_de = 'Khao sat hai long thang 10';
UPDATE khaosat SET mo_ta = 'Khảo sát nhanh sau khi dùng cà phê' WHERE BINARY mo_ta = 'Khao sat nhanh sau khi dung ca phe';

UPDATE cauhoi SET noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?' WHERE BINARY noi_dung_cau_hoi = 'Ban thuong ghe quan vao khung gio nao?';
UPDATE cauhoi SET noi_dung_cau_hoi = 'Bạn hài lòng với chất lượng đồ uống ở mức nào (1-5)?' WHERE BINARY noi_dung_cau_hoi = 'Ban hai long voi chat luong do uong o muc nao (1-5)?';
UPDATE cauhoi SET noi_dung_cau_hoi = 'Bạn muốn quán cải thiện điều gì?' WHERE BINARY noi_dung_cau_hoi = 'Ban muon quan cai thien dieu gi?';

UPDATE dapan d JOIN cauhoi c ON c.id = d.cau_hoi_id SET d.noi_dung = 'Sáng'  WHERE BINARY d.noi_dung = 'Sang'  AND c.noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?';
UPDATE dapan d JOIN cauhoi c ON c.id = d.cau_hoi_id SET d.noi_dung = 'Trưa'  WHERE BINARY d.noi_dung = 'Trua'  AND c.noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?';
UPDATE dapan d JOIN cauhoi c ON c.id = d.cau_hoi_id SET d.noi_dung = 'Chiều' WHERE BINARY d.noi_dung = 'Chieu' AND c.noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?';
UPDATE dapan d JOIN cauhoi c ON c.id = d.cau_hoi_id SET d.noi_dung = 'Tối'   WHERE BINARY d.noi_dung = 'Toi'   AND c.noi_dung_cau_hoi = 'Bạn thường ghé quán vào khung giờ nào?';

UPDATE khachhang SET ho_ten = 'Nguyễn Văn A (đã sửa)' WHERE BINARY ho_ten = 'Nguyen Van A (da sua)';
UPDATE khachhang SET ho_ten = 'Trần Thị B' WHERE BINARY ho_ten = 'Tran Thi B';
UPDATE khachhang SET so_thich = 'trà sữa' WHERE BINARY so_thich = 'tra sua';
UPDATE quanly SET ho_ten = 'Quản lý' WHERE BINARY ho_ten = 'quan ly';
UPDATE phanhoi SET noi_dung = 'Cafe rất ngon nhưng hơi lâu' WHERE BINARY noi_dung = 'Cafe rat ngon nhung hoi lau ban';
