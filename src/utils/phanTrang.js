// Đọc tham số phân trang từ query string: ?trang=1&moi_trang=10
function thamSoPhanTrang(req, mocDinhMoiTrang = 10) {
  const trang = Math.max(1, parseInt(req.query.trang, 10) || 1);
  const moiTrang = Math.max(1, Math.min(100, parseInt(req.query.moi_trang, 10) || mocDinhMoiTrang));
  const offset = (trang - 1) * moiTrang;
  return { trang, moiTrang, offset };
}

// Đóng gói kết quả phân trang theo format thống nhất cho toàn bộ API
function ketQuaPhanTrang(duLieu, tongSoBanGhi, trang, moiTrang) {
  return {
    du_lieu: duLieu,
    trang_hien_tai: trang,
    moi_trang: moiTrang,
    tong_so_ban_ghi: tongSoBanGhi,
    tong_so_trang: Math.max(1, Math.ceil(tongSoBanGhi / moiTrang)),
  };
}

module.exports = { thamSoPhanTrang, ketQuaPhanTrang };
