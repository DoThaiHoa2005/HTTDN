const pool = require('../config/db');
const { thamSoPhanTrang } = require('../utils/phanTrang');

const DO_DAI_PHAN_HOI_TOI_DA = 1000;

// POST /api/phan-hoi (yêu cầu token khách hàng)
// body: { noi_dung }
async function guiPhanHoi(req, res) {
  const { noi_dung } = req.body;

  if (typeof noi_dung !== 'string' || noi_dung.trim() === '') {
    return res.status(400).json({ message: 'Nội dung phản hồi không được để trống' });
  }
  if (noi_dung.trim().length > DO_DAI_PHAN_HOI_TOI_DA) {
    return res.status(400).json({ message: `Phản hồi không được dài quá ${DO_DAI_PHAN_HOI_TOI_DA} ký tự` });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO phanhoi (khach_hang_id, noi_dung) VALUES (?, ?)',
      [req.khachHang.id, noi_dung.trim()]
    );
    return res.status(201).json({
      message: 'Gửi phản hồi thành công',
      phanHoiId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi gửi phản hồi' });
  }
}

// GET /api/phan-hoi/cua-toi (yêu cầu token khách hàng) - xem lại phản hồi đã gửi + câu trả lời của quán
async function xemPhanHoiCuaToi(req, res) {
  // Mặc định 50 phản hồi mới nhất, có thể phân trang bằng ?trang=&moi_trang= (vẫn trả về mảng như cũ)
  const { moiTrang, offset } = thamSoPhanTrang(req, 50);
  try {
    const [rows] = await pool.query(
      `SELECT id, noi_dung, ngay_gui, trang_thai_xu_ly, tra_loi, ngay_tra_loi
       FROM phanhoi WHERE khach_hang_id = ? ORDER BY ngay_gui DESC LIMIT ? OFFSET ?`,
      [req.khachHang.id, moiTrang, offset]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { guiPhanHoi, xemPhanHoiCuaToi };
