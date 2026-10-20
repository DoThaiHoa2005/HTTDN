# Cafe CRM Backend

Backend Node.js (Express + MySQL2) cho module CRM trong đồ án HTTTDN.

## Yêu cầu
- Đã cài Node.js
- Đã cài XAMPP và bật **MySQL** trong XAMPP Control Panel (chỉ dùng XAMPP cho CSDL; backend chạy bằng Node.js, không đặt trong `htdocs`)
- Đã tạo CSDL `cafe_crm` (collation `utf8mb4_unicode_ci`) trong phpMyAdmin (`http://localhost/phpmyadmin`) và import file `../db/cafe_crm.sql` (tab Import)

## Cài đặt

```bash
npm install
cp .env.example .env
```

Mở file `.env` vừa tạo, kiểm tra lại thông tin kết nối MySQL (mặc định XAMPP là user `root`, không mật khẩu, cổng 3306, `DB_NAME=cafe_crm`) và đổi `JWT_SECRET`.

## Chạy project

```bash
npm run dev
```

Server chạy tại `http://localhost:3000`

## Tạo tài khoản quản lý đầu tiên

Hệ thống không có API đăng ký quản lý công khai (hợp lý vì bảo mật). Dùng script sau để tạo tài khoản quản lý đầu tiên:

```bash
node scripts/tao-tai-khoan-quan-ly.js admin MatKhau123 admin
```

Tham số theo thứ tự: `ten_dang_nhap`, `mat_khau`, `vai_tro` (`admin`, `quan_ly` hoặc `nhan_vien`, mặc định `admin`). Script tự hash mật khẩu bằng bcrypt trước khi lưu. Sau khi chạy xong, đăng nhập qua `POST /api/quan-ly/dang-nhap` với đúng `ten_dang_nhap`/`mat_khau` vừa tạo.

## Nâng cấp CRM (phiên bản giao diện mới)

Phiên bản này bổ sung các chức năng CRM còn thiếu. **Không cần chạy migration thủ công**: khi `npm run dev`, server tự thêm các cột mới (`phanhoi.tra_loi/ngay_tra_loi/nguoi_tra_loi_id`, `khaosat.trang_thai`, `khachhang.ghi_chu`). File `migration_nang_cap_crm.sql` chỉ để tham khảo / chạy tay.

**Dữ liệu mẫu để demo** (42 khách hàng, phản hồi, khảo sát, đánh giá, sản phẩm — trải đều 6 tháng để dashboard/báo cáo có biểu đồ đẹp):
```bash
npm run seed
```
Khách mẫu: SĐT `0910000001` → `0910000042`, mật khẩu `matkhau123`. Nhân viên mẫu: `nhanvien1..3`, `quanly_ca` (mật khẩu `nhanvien123`). Chạy 1 lần duy nhất (tự bỏ qua nếu đã có dữ liệu mẫu).

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| PUT | /api/auth/doi-mat-khau | Khách | Đổi mật khẩu (cần mật khẩu cũ) |
| GET | /api/quan-ly/tong-quan | admin, quản lý | Số liệu dashboard: KPI, khách mới theo tháng, tương tác 14 ngày, top món/nhân viên, phân bố sao |
| GET | /api/quan-ly/toi | Mọi vai trò | Thông tin tài khoản đang đăng nhập |
| PUT | /api/quan-ly/doi-mat-khau | Mọi vai trò | Tự đổi mật khẩu |
| GET | /api/quan-ly/khach-hang/:id | admin, quản lý | Hồ sơ khách 360°: thông tin + lịch sử góp ý/đánh giá/khảo sát |
| PUT | /api/quan-ly/khach-hang/:id | admin, quản lý | Sửa thông tin + ghi chú nội bộ |
| PATCH | /api/quan-ly/phan-hoi/:id | admin, quản lý | Body `{ tra_loi }` => lưu câu trả lời + tự đánh dấu đã xử lý |
| PATCH | /api/quan-ly/khao-sat/:id/trang-thai | admin, quản lý | Đóng / mở lại khảo sát |
| DELETE | /api/quan-ly/khao-sat/:id | admin, quản lý | Xóa khảo sát (cascade câu hỏi, đáp án, kết quả) |
| PATCH | /api/quan-ly/tai-khoan/:id/mat-khau | admin | Đặt lại mật khẩu cho tài khoản khác |

Cải tiến khác: `GET /khach-hang` thêm `sap_xep` (`moi_nhat`/`cu_nhat`/`ten_az`/`tuong_tac`) và trả số lượng tương tác từng khách + `dem` theo trạng thái; `GET /phan-hoi` thêm `tim_kiem` + `dem`; `GET /san-pham` (công khai) thêm `sap_xep` (`danh_gia`/`gia_tang`/`gia_giam`/`ten_az`); `GET /khach-hang/bao-cao` thêm `theoThang`.

**Bảo mật/ chất lượng dữ liệu**: SĐT phải đủ 10 số bắt đầu bằng 0 (tự chuẩn hóa `+84`, khoảng trắng); mật khẩu tối thiểu 6 ký tự; ngày sinh không ở tương lai; token khách/quản lý được **đối chiếu lại CSDL ở mỗi request** => khóa khách, xóa hoặc đổi quyền tài khoản có hiệu lực **ngay lập tức** (trước đây phải chờ token hết hạn sau 7 ngày); khảo sát chỉ nộp được khi đang mở và đáp án phải thuộc đúng câu hỏi; xóa/đổi ảnh sản phẩm tự dọn file cũ.

## Test nhanh bằng Postman / Thunder Client

File `cafe-crm-postman-collection.json` chứa sẵn toàn bộ 17 request (khách hàng + quản lý), đã nhóm theo từng nhóm chức năng.

**Import vào Postman**: File → Import → chọn file `cafe-crm-postman-collection.json`

**Import vào Thunder Client (VS Code)**: mở tab Thunder Client → Collections → nút menu (3 chấm) → Import → chọn file này

Sau khi import:
1. Chạy request **"Dang nhap"** (mục 1) hoặc **"Đăng nhập quản lý"** (mục 4) trước — token trả về sẽ tự động lưu vào biến `customer_token` / `manager_token` của collection (nhờ script test có sẵn), không cần copy tay
2. Các request còn lại tự dùng `{{customer_token}}` / `{{manager_token}}` trong header Authorization
3. Nếu đổi cổng chạy server, sửa biến `base_url` trong collection (mặc định `http://localhost:3000`)
4. Vài request dùng biến `{{customer_id}}`, `{{feedback_id}}`, `{{khao_sat_id}}` — chỉnh giá trị này (trong tab Variables của collection) theo id thật trong CSDL của bạn

## Danh sách API (phía khách hàng)

| Method | Endpoint | Cần token | Mô tả |
|---|---|---|---|
| POST | /api/auth/dang-ky | Không | Đăng ký tài khoản khách hàng |
| POST | /api/auth/dang-nhap | Không | Đăng nhập, trả về token |
| GET | /api/auth/thong-tin | Có | Xem thông tin cá nhân |
| PUT | /api/auth/thong-tin | Có | Sửa thông tin cá nhân |
| POST | /api/phan-hoi | Có | Gửi phản hồi/góp ý |
| GET | /api/phan-hoi/cua-toi | Có | Xem lại phản hồi đã gửi |
| GET | /api/khao-sat/dang-hoat-dong | Có | Lấy khảo sát mới nhất kèm câu hỏi |
| POST | /api/khao-sat/tra-loi | Có | Nộp câu trả lời khảo sát |

Với các route "Có" token, gửi header:
```
Authorization: Bearer <token nhận được sau khi đăng nhập>
```

## Danh sách API (phía quản lý)

Tất cả route bên dưới (trừ đăng nhập) yêu cầu header:
```
Authorization: Bearer <token nhận được sau khi quản lý đăng nhập>
```

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | /api/quan-ly/dang-nhap | Đăng nhập quản lý, trả về token |
| GET | /api/quan-ly/khach-hang | Danh sách khách hàng (lọc theo `trang_thai`, tìm theo `tim_kiem`) |
| POST | /api/quan-ly/khach-hang | Thêm khách hàng mới |
| DELETE | /api/quan-ly/khach-hang/:id | Xóa khách hàng |
| PATCH | /api/quan-ly/khach-hang/:id/trang-thai | Khóa/mở khóa tài khoản khách hàng |
| GET | /api/quan-ly/khach-hang/bao-cao | Báo cáo tỷ lệ độ tuổi và sở thích |
| GET | /api/quan-ly/phan-hoi | Danh sách phản hồi (lọc theo `trang_thai_xu_ly`) |
| PATCH | /api/quan-ly/phan-hoi/:id | Cập nhật trạng thái xử lý phản hồi |
| POST | /api/quan-ly/khao-sat | Tạo khảo sát mới (kèm câu hỏi + đáp án) |
| GET | /api/quan-ly/khao-sat | Danh sách khảo sát đã tạo |
| GET | /api/quan-ly/khao-sat/:id/thong-ke | Thống kê kết quả 1 khảo sát |

### Ví dụ body khi tạo khảo sát (POST /api/quan-ly/khao-sat)
```json
{
  "tieu_de": "Khảo sát hài lòng tháng 10",
  "mo_ta": "Khảo sát nhanh sau khi dùng cà phê",
  "cauHoi": [
    {
      "noi_dung_cau_hoi": "Bạn thường ghé quán vào khung giờ nào?",
      "loai_cau_hoi": "trac_nghiem",
      "dapAn": ["Sáng", "Trưa", "Chiều", "Tối"]
    },
    {
      "noi_dung_cau_hoi": "Bạn hài lòng với chất lượng đồ uống ở mức nào (1-5)?",
      "loai_cau_hoi": "thang_do"
    },
    {
      "noi_dung_cau_hoi": "Bạn muốn quán cải thiện điều gì?",
      "loai_cau_hoi": "tu_luan"
    }
  ]
}
```

## Lưu ý quan trọng
Token khách hàng và token quản lý là 2 loại tách biệt (`loai: 'khach_hang'` / `loai: 'quan_ly'`) — dùng nhầm loại token sẽ bị từ chối với lỗi 403, tránh khách hàng gọi được vào API quản lý.

## Khu vực Admin (mục II.2 đề bài)

Bảng `sanpham` (kèm dữ liệu mẫu) đã có sẵn trong `db/cafe_crm.sql`. File `migration_them_bang_sanpham.sql` chỉ cần chạy qua phpMyAdmin nếu bạn đang dùng một CSDL cũ chưa có bảng này.

**Khu vực Admin tách biệt với khu vực CRM**: chỉ tài khoản có `vai_tro = 'admin'` mới gọi được các API bên dưới — tài khoản `vai_tro = 'nhan_vien'` sẽ nhận lỗi 403.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | /api/quan-ly/san-pham | Xem/tìm kiếm/tìm kiếm nâng cao/lọc/sắp xếp sản phẩm |
| GET | /api/quan-ly/san-pham/danh-muc | Danh sách danh mục hiện có (phục vụ dropdown lọc) |
| POST | /api/quan-ly/san-pham | Thêm sản phẩm |
| PUT | /api/quan-ly/san-pham/:id | Sửa sản phẩm |
| DELETE | /api/quan-ly/san-pham/:id | Xóa sản phẩm |
| POST | /api/quan-ly/san-pham/upload-anh | Upload ảnh sản phẩm (multipart/form-data, field `anh`), trả về `{ url }` |

### Upload ảnh sản phẩm
Ảnh được lưu vào thư mục `uploads/san-pham/` trên server (tự tạo khi chạy lần đầu), truy cập qua URL tĩnh `http://localhost:3000/uploads/san-pham/<tên_file>`. Giới hạn 5MB/ảnh, chỉ nhận JPG/PNG/WEBP/GIF. Giá trị lưu vào cột `hinh_anh` là đường dẫn tương đối (vd: `/uploads/san-pham/xxx.jpg`), không phải URL đầy đủ — phía frontend tự ghép với `VITE_API_URL` khi hiển thị.

| GET | /api/quan-ly/tai-khoan | Danh sách tài khoản quản lý |
| POST | /api/quan-ly/tai-khoan | Thêm tài khoản quản lý mới (có thể kèm `ho_ten` hiển thị) |
| PATCH | /api/quan-ly/tai-khoan/:id/vai-tro | Phân quyền (đổi `admin` ⇄ `nhan_vien`) |
| PATCH | /api/quan-ly/tai-khoan/:id/ho-ten | Sửa họ tên hiển thị cho tài khoản |
| DELETE | /api/quan-ly/tai-khoan/:id | Xóa tài khoản quản lý |

### Query hỗ trợ tìm kiếm nâng cao cho `GET /api/quan-ly/san-pham`
`tim_kiem` (theo tên), `danh_muc`, `trang_thai` (`dang_ban`/`ngung_ban`), `gia_tu`, `gia_den`, `sap_xep` (`gia_tang`/`gia_giam`/`ten_az`/`ten_za`/`moi_nhat`/`cu_nhat`) — có thể kết hợp nhiều tham số cùng lúc.

### Ràng buộc an toàn khi phân quyền/xóa tài khoản
- Không tự hạ quyền hoặc tự xóa tài khoản đang đăng nhập
- Không được xóa/hạ quyền nếu đó là tài khoản `admin` cuối cùng trong hệ thống (tránh khóa chết toàn bộ khu Admin)

## Chức năng đánh giá sản phẩm & nhân viên

Cột `quanly.ho_ten` (tên hiển thị cho khách hàng thấy) và 2 bảng `danhgiasanpham`, `danhgianhanvien` đã có sẵn trong `db/cafe_crm.sql`. File `migration_them_danh_gia.sql` chỉ cần chạy qua phpMyAdmin (sau `migration_them_bang_sanpham.sql`) nếu CSDL cũ chưa có các thành phần này.

| Method | Endpoint | Cần token | Mô tả |
|---|---|---|---|
| GET | /api/danh-gia/san-pham/:id | Không | Điểm trung bình + số lượt đánh giá của 1 sản phẩm |
| POST | /api/danh-gia/san-pham | Khách hàng | Gửi/cập nhật đánh giá sản phẩm (so_sao 1-5, nhan_xet tùy chọn) |
| GET | /api/danh-gia/nhan-vien | Không | Danh sách nhân viên kèm điểm trung bình để khách chọn đánh giá |
| POST | /api/danh-gia/nhan-vien | Khách hàng | Gửi/cập nhật đánh giá nhân viên |
| GET | /api/quan-ly/danh-gia/san-pham | Quản lý | Tổng hợp điểm trung bình từng sản phẩm |
| GET | /api/quan-ly/danh-gia/san-pham/:id/nhan-xet | Quản lý | Danh sách nhận xét chữ cho 1 sản phẩm |
| GET | /api/quan-ly/danh-gia/nhan-vien | Quản lý | Tổng hợp điểm trung bình từng nhân viên |
| GET | /api/quan-ly/danh-gia/nhan-vien/:id/nhan-xet | Quản lý | Danh sách nhận xét chữ cho 1 nhân viên |

Mỗi khách hàng chỉ đánh giá được 1 lần cho mỗi sản phẩm/nhân viên — gửi lại sẽ ghi đè đánh giá cũ (không tạo bản ghi trùng), nhờ ràng buộc UNIQUE trong CSDL.

**Đánh giá qua mã QR**: frontend tạo QR trỏ đến `/danh-gia/san-pham/:id` hoặc `/danh-gia-nhan-vien/:id`. Route công khai `GET /api/san-pham/:id` (chi tiết 1 sản phẩm kèm điểm trung bình) được thêm để phục vụ trang đích này.

## Migration: thêm vai trò "Quản lý" (phân quyền 3 cấp)

Chạy `migration_them_vai_tro_quan_ly.sql` (sau các migration trên). Từ đây `vai_tro` có 3 giá trị:

| Vai trò | Khu CRM (khách hàng/phản hồi/khảo sát/đánh giá) | Sản phẩm (mục II Admin) | Tài khoản | QR sản phẩm | QR nhân viên |
|---|---|---|---|---|---|
| `admin` | Toàn quyền | Toàn quyền | Toàn quyền (thêm/xóa/phân quyền) | Tạo được | Tạo được |
| `quan_ly` | Toàn quyền | Không truy cập | Chỉ xem (để lấy QR) | Không tạo được | Tạo được |
| `nhan_vien` | **Không truy cập** | Không truy cập | Không truy cập | Chỉ nhận (xem tại "QR của tôi") | Chỉ nhận (QR của chính mình) |

Toàn bộ route CRM (`/khach-hang`, `/phan-hoi`, `/khao-sat`, `/danh-gia`) giờ chặn `nhan_vien` ở tầng middleware (`chiAdminHoacQuanLy`), không chỉ ẩn trên giao diện — gọi thẳng API cũng bị từ chối với lỗi 403.

Ngoài ra, khách hàng **không tự đánh giá tự do** được nữa — trang chủ chỉ hiển thị điểm trung bình (read-only), và trang đánh giá nhân viên/sản phẩm chỉ mở được khi có `:id` cụ thể trong URL (tức là phải quét đúng mã QR), không có danh sách mở để chọn đánh giá bất kỳ ai/món nào.

**Tài khoản admin được ẩn khỏi mọi nơi nếu người xem không phải admin**: `GET /api/quan-ly/tai-khoan` lọc bỏ các dòng `vai_tro = 'admin'` khi người gọi là `quan_ly`; danh sách nhân viên công khai (`GET /api/danh-gia/nhan-vien`) và bảng tổng hợp đánh giá nhân viên (`GET /api/quan-ly/danh-gia/nhan-vien`) loại bỏ admin hoàn toàn — admin là vai trò quản trị hệ thống, không phải nhân viên phục vụ nên không cần và không thể bị khách hàng đánh giá (kể cả cố tình gọi thẳng API cũng bị chặn với lỗi 403).

`GET /api/quan-ly/tai-khoan` nới quyền cho cả `quan_ly` (không chỉ `admin`); các API còn lại của tài khoản (thêm/sửa/xóa/phân quyền) vẫn chỉ `admin`.

## Phân trang

Các API danh sách sau hỗ trợ phân trang qua query `?trang=1&moi_trang=10` (mặc định trang 1, 10 bản ghi/trang; sản phẩm công khai mặc định 12):

- `GET /api/quan-ly/san-pham`, `GET /api/san-pham` (công khai)
- `GET /api/quan-ly/khach-hang`
- `GET /api/quan-ly/phan-hoi`
- `GET /api/quan-ly/khao-sat`
- `GET /api/quan-ly/tai-khoan`
- `GET /api/quan-ly/danh-gia/san-pham`, `.../nhan-vien` (cả 2 danh sách tổng hợp lẫn danh sách nhận xét theo id)

Response đổi từ mảng thuần sang dạng:
```json
{
  "du_lieu": [...],
  "trang_hien_tai": 1,
  "moi_trang": 10,
  "tong_so_ban_ghi": 42,
  "tong_so_trang": 5
}
```
Đây là thay đổi phá vỡ tương thích (breaking change) với phiên bản cũ — frontend đã được cập nhật để đọc đúng field `du_lieu` thay vì coi response là mảng trực tiếp.

## Việc cần làm tiếp
- Viết validate input kỹ hơn (định dạng số điện thoại, độ dài mật khẩu tối thiểu...)
- Cân nhắc thêm phân trang (pagination) cho danh sách khách hàng/phản hồi khi dữ liệu lớn
