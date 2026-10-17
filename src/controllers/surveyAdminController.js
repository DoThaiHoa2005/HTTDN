const pool = require('../config/db');
const { thamSoPhanTrang, ketQuaPhanTrang } = require('../utils/phanTrang');

const LOAI_CAU_HOI_HOP_LE = ['trac_nghiem', 'thang_do', 'tu_luan'];

// POST /api/quan-ly/khao-sat
// body: {
//   tieu_de, mo_ta,
//   cauHoi: [
//     { noi_dung_cau_hoi, loai_cau_hoi: 'trac_nghiem', dapAn: ['A','B','C'] },
//     { noi_dung_cau_hoi, loai_cau_hoi: 'thang_do' },
//     { noi_dung_cau_hoi, loai_cau_hoi: 'tu_luan' }
//   ]
// }
async function taoKhaoSat(req, res) {
  const { tieu_de, mo_ta, cauHoi } = req.body;

  if (!tieu_de || !tieu_de.trim() || !Array.isArray(cauHoi) || cauHoi.length === 0) {
    return res.status(400).json({ message: 'Thiếu tiêu đề hoặc danh sách câu hỏi' });
  }

  // Kiểm tra toàn bộ câu hỏi trước khi ghi DB
  for (const ch of cauHoi) {
    if (!ch.noi_dung_cau_hoi || !String(ch.noi_dung_cau_hoi).trim() || !LOAI_CAU_HOI_HOP_LE.includes(ch.loai_cau_hoi)) {
      return res.status(400).json({ message: 'Mỗi câu hỏi cần có nội dung và loại câu hỏi hợp lệ' });
    }
    if (ch.loai_cau_hoi === 'trac_nghiem') {
      const dapAnHopLe = (ch.dapAn || []).filter((d) => String(d).trim());
      if (dapAnHopLe.length < 2) {
        return res.status(400).json({ message: 'Câu trắc nghiệm cần ít nhất 2 đáp án' });
      }
    }
  }

  const ketNoi = await pool.getConnection();
  try {
    await ketNoi.beginTransaction();

    const [khaoSatResult] = await ketNoi.query(
      'INSERT INTO khaosat (quan_ly_id, tieu_de, mo_ta) VALUES (?, ?, ?)',
      [req.quanLy.id, tieu_de.trim(), mo_ta ? String(mo_ta).trim() || null : null]
    );
    const khaoSatId = khaoSatResult.insertId;

    for (const cauHoiItem of cauHoi) {
      const { noi_dung_cau_hoi, loai_cau_hoi, dapAn } = cauHoiItem;

      const [cauHoiResult] = await ketNoi.query(
        'INSERT INTO cauhoi (khao_sat_id, noi_dung_cau_hoi, loai_cau_hoi) VALUES (?, ?, ?)',
        [khaoSatId, String(noi_dung_cau_hoi).trim(), loai_cau_hoi]
      );

      if (loai_cau_hoi === 'trac_nghiem') {
        const dsDapAn = dapAn.filter((d) => String(d).trim());
        for (let i = 0; i < dsDapAn.length; i++) {
          await ketNoi.query(
            'INSERT INTO dapan (cau_hoi_id, noi_dung, thu_tu) VALUES (?, ?, ?)',
            [cauHoiResult.insertId, String(dsDapAn[i]).trim(), i + 1]
          );
        }
      }
    }

    await ketNoi.commit();
    return res.status(201).json({ message: 'Tạo khảo sát thành công', khaoSatId });
  } catch (err) {
    await ketNoi.rollback().catch(() => {});
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi tạo khảo sát' });
  } finally {
    ketNoi.release();
  }
}

// GET /api/quan-ly/khao-sat - danh sách khảo sát đã tạo kèm số câu hỏi + số khách đã trả lời
async function danhSachKhaoSat(req, res) {
  const { trang, moiTrang, offset } = thamSoPhanTrang(req);
  try {
    const [[{ tongSoBanGhi }]] = await pool.query('SELECT COUNT(*) AS tongSoBanGhi FROM khaosat');
    const [rows] = await pool.query(
      `SELECT ks.id, ks.tieu_de, ks.mo_ta, ks.ngay_tao, ks.trang_thai,
              (SELECT COUNT(*) FROM cauhoi ch WHERE ch.khao_sat_id = ks.id) AS so_cau_hoi,
              (SELECT COUNT(DISTINCT kq.khach_hang_id) FROM ketquakhaosat kq
                 JOIN cauhoi ch ON ch.id = kq.cau_hoi_id WHERE ch.khao_sat_id = ks.id) AS so_nguoi_tra_loi
       FROM khaosat ks ORDER BY ks.ngay_tao DESC, ks.id DESC LIMIT ? OFFSET ?`,
      [moiTrang, offset]
    );
    return res.json(ketQuaPhanTrang(rows, tongSoBanGhi, trang, moiTrang));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/quan-ly/khao-sat/:id/thong-ke
// Thống kê: trắc nghiệm -> đếm số lượt chọn mỗi đáp án
//           thang_do    -> điểm trung bình + phân bố 1-5
//           tu_luan     -> danh sách câu trả lời
async function thongKeKhaoSat(req, res) {
  const khaoSatId = req.params.id;

  try {
    const [[khaoSat]] = await pool.query(
      'SELECT id, tieu_de, mo_ta, ngay_tao, trang_thai FROM khaosat WHERE id = ?',
      [khaoSatId]
    );
    if (!khaoSat) {
      return res.status(404).json({ message: 'Không tìm thấy khảo sát' });
    }

    const [cauHoiRows] = await pool.query(
      'SELECT id, noi_dung_cau_hoi, loai_cau_hoi FROM cauhoi WHERE khao_sat_id = ? ORDER BY id ASC',
      [khaoSatId]
    );

    const [[{ soNguoi }]] = await pool.query(
      `SELECT COUNT(DISTINCT kq.khach_hang_id) AS soNguoi
       FROM ketquakhaosat kq JOIN cauhoi ch ON ch.id = kq.cau_hoi_id WHERE ch.khao_sat_id = ?`,
      [khaoSatId]
    );

    const ketQua = [];

    for (const cauHoi of cauHoiRows) {
      if (cauHoi.loai_cau_hoi === 'trac_nghiem') {
        const [thongKe] = await pool.query(
          `SELECT da.id AS dap_an_id, da.noi_dung, COUNT(kq.id) AS so_luot_chon
           FROM dapan da
           LEFT JOIN ketquakhaosat kq ON kq.dap_an_id = da.id
           WHERE da.cau_hoi_id = ?
           GROUP BY da.id, da.noi_dung
           ORDER BY da.thu_tu ASC`,
          [cauHoi.id]
        );
        ketQua.push({ ...cauHoi, thongKe });
      } else if (cauHoi.loai_cau_hoi === 'thang_do') {
        const [[diemTrungBinh]] = await pool.query(
          `SELECT AVG(gia_tri_so) AS diem_trung_binh, COUNT(*) AS so_luot_tra_loi
           FROM ketquakhaosat WHERE cau_hoi_id = ?`,
          [cauHoi.id]
        );
        const [phanBo] = await pool.query(
          `SELECT gia_tri_so AS diem, COUNT(*) AS so_luot
           FROM ketquakhaosat WHERE cau_hoi_id = ? AND gia_tri_so IS NOT NULL GROUP BY gia_tri_so`,
          [cauHoi.id]
        );
        const phanBoDay = [1, 2, 3, 4, 5].map((d) => ({
          diem: d,
          so_luot: Number(phanBo.find((p) => p.diem === d)?.so_luot || 0),
        }));
        ketQua.push({ ...cauHoi, thongKe: { ...diemTrungBinh, phan_bo: phanBoDay } });
      } else {
        const [danhSachTraLoi] = await pool.query(
          `SELECT kh.ho_ten, kq.cau_tra_loi, kq.ngay_thuc_hien
           FROM ketquakhaosat kq
           JOIN khachhang kh ON kh.id = kq.khach_hang_id
           WHERE kq.cau_hoi_id = ?
           ORDER BY kq.ngay_thuc_hien DESC`,
          [cauHoi.id]
        );
        ketQua.push({ ...cauHoi, thongKe: danhSachTraLoi });
      }
    }

    return res.json({
      khaoSatId: Number(khaoSatId),
      tieu_de: khaoSat.tieu_de,
      mo_ta: khaoSat.mo_ta,
      ngay_tao: khaoSat.ngay_tao,
      trang_thai: khaoSat.trang_thai,
      so_nguoi_tra_loi: soNguoi,
      cauHoi: ketQua,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi thống kê' });
  }
}

// PATCH /api/quan-ly/khao-sat/:id/trang-thai
// body: { trang_thai: 'dang_mo' | 'da_dong' }
async function doiTrangThaiKhaoSat(req, res) {
  const { trang_thai } = req.body;
  if (!['dang_mo', 'da_dong'].includes(trang_thai)) {
    return res.status(400).json({ message: "trang_thai phải là 'dang_mo' hoặc 'da_dong'" });
  }
  try {
    const [result] = await pool.query('UPDATE khaosat SET trang_thai = ? WHERE id = ?', [trang_thai, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khảo sát' });
    }
    return res.json({ message: trang_thai === 'da_dong' ? 'Đã đóng khảo sát' : 'Đã mở lại khảo sát' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// DELETE /api/quan-ly/khao-sat/:id - xóa khảo sát (câu hỏi, đáp án, kết quả bị xóa theo nhờ ON DELETE CASCADE)
async function xoaKhaoSat(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM khaosat WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khảo sát' });
    }
    return res.json({ message: 'Xóa khảo sát thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { taoKhaoSat, danhSachKhaoSat, thongKeKhaoSat, doiTrangThaiKhaoSat, xoaKhaoSat };
