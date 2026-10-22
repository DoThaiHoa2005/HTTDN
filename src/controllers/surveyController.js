const pool = require('../config/db');

// GET /api/khao-sat/dang-hoat-dong (yêu cầu token khách hàng)
// Trả về khảo sát ĐANG MỞ mới nhất kèm câu hỏi + đáp án, và bài làm trước đó của khách (nếu có)
async function layKhaoSatDangHoatDong(req, res) {
  try {
    const [khaoSatRows] = await pool.query(
      `SELECT id, tieu_de, mo_ta, ngay_tao FROM khaosat
       WHERE trang_thai = 'dang_mo' ORDER BY ngay_tao DESC, id DESC LIMIT 1`
    );

    if (khaoSatRows.length === 0) {
      return res.status(404).json({ message: 'Hiện chưa có khảo sát nào' });
    }

    const khaoSat = khaoSatRows[0];

    const [cauHoiRows] = await pool.query(
      'SELECT id, noi_dung_cau_hoi, loai_cau_hoi FROM cauhoi WHERE khao_sat_id = ? ORDER BY id ASC',
      [khaoSat.id]
    );

    // Với mỗi câu trắc nghiệm, lấy thêm danh sách đáp án theo đúng thứ tự
    for (const cauHoi of cauHoiRows) {
      if (cauHoi.loai_cau_hoi === 'trac_nghiem') {
        const [dapAnRows] = await pool.query(
          'SELECT id, noi_dung FROM dapan WHERE cau_hoi_id = ? ORDER BY thu_tu ASC',
          [cauHoi.id]
        );
        cauHoi.dapAn = dapAnRows;
      }
    }

    // Bài làm trước đó của khách (để hiển thị sẵn và cho phép cập nhật)
    const [baiLamTruoc] = await pool.query(
      `SELECT kq.cau_hoi_id, kq.dap_an_id, kq.gia_tri_so, kq.cau_tra_loi
       FROM ketquakhaosat kq JOIN cauhoi ch ON ch.id = kq.cau_hoi_id
       WHERE ch.khao_sat_id = ? AND kq.khach_hang_id = ?`,
      [khaoSat.id, req.khachHang.id]
    );

    return res.json({
      ...khaoSat,
      cauHoi: cauHoiRows,
      da_lam: baiLamTruoc.length > 0,
      bai_lam_truoc: baiLamTruoc,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy khảo sát' });
  }
}

// POST /api/khao-sat/tra-loi (yêu cầu token khách hàng)
// body: { cauTraLoi: [ { cau_hoi_id, dap_an_id?, cau_tra_loi?, gia_tri_so? }, ... ] }
async function nopTraLoiKhaoSat(req, res) {
  const { cauTraLoi } = req.body;

  if (!Array.isArray(cauTraLoi) || cauTraLoi.length === 0 || cauTraLoi.length > 100 || cauTraLoi.some((c) => !c || typeof c !== 'object')) {
    return res.status(400).json({ message: 'Danh sách câu trả lời không hợp lệ' });
  }

  const ketNoi = await pool.getConnection();
  try {
    // Kiểm tra các câu hỏi có tồn tại và thuộc khảo sát đang mở hay không
    const dsCauHoiId = cauTraLoi.map((c) => Number(c.cau_hoi_id)).filter(Boolean);
    if (dsCauHoiId.length !== cauTraLoi.length) {
      return res.status(400).json({ message: 'Thiếu cau_hoi_id trong một câu trả lời' });
    }

    const [cauHoiHopLe] = await ketNoi.query(
      `SELECT ch.id, ch.loai_cau_hoi
       FROM cauhoi ch JOIN khaosat ks ON ks.id = ch.khao_sat_id
       WHERE ch.id IN (?) AND ks.trang_thai = 'dang_mo'`,
      [dsCauHoiId]
    );
    const loaiTheoId = Object.fromEntries(cauHoiHopLe.map((c) => [c.id, c.loai_cau_hoi]));
    if (cauHoiHopLe.length !== new Set(dsCauHoiId).size) {
      return res.status(400).json({ message: 'Khảo sát đã đóng hoặc có câu hỏi không tồn tại' });
    }

    await ketNoi.beginTransaction();

    for (const cauTra of cauTraLoi) {
      const { cau_hoi_id, dap_an_id, cau_tra_loi, gia_tri_so } = cauTra;
      const loai = loaiTheoId[cau_hoi_id];

      if (loai === 'thang_do' && !(Number(gia_tri_so) >= 1 && Number(gia_tri_so) <= 5)) {
        throw Object.assign(new Error('Điểm thang đo phải từ 1 đến 5'), { loaiLoi: 400 });
      }
      if (loai === 'trac_nghiem') {
        const [[dapAn]] = await ketNoi.query(
          'SELECT id FROM dapan WHERE id = ? AND cau_hoi_id = ?',
          [dap_an_id || 0, cau_hoi_id]
        );
        if (!dapAn) throw Object.assign(new Error('Đáp án không thuộc câu hỏi'), { loaiLoi: 400 });
      }

      // ON DUPLICATE KEY để khách sửa lại câu trả lời nếu làm khảo sát lần 2
      await ketNoi.query(
        `INSERT INTO ketquakhaosat
           (cau_hoi_id, khach_hang_id, dap_an_id, cau_tra_loi, gia_tri_so)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           dap_an_id = VALUES(dap_an_id),
           cau_tra_loi = VALUES(cau_tra_loi),
           gia_tri_so = VALUES(gia_tri_so),
           ngay_thuc_hien = CURRENT_TIMESTAMP`,
        [
          cau_hoi_id,
          req.khachHang.id,
          loai === 'trac_nghiem' ? dap_an_id : null,
          loai === 'tu_luan' ? String(cau_tra_loi || '').trim().slice(0, 2000) || null : null,
          loai === 'thang_do' ? Number(gia_tri_so) : null,
        ]
      );
    }

    await ketNoi.commit();
    return res.status(201).json({ message: 'Cảm ơn bạn đã hoàn thành khảo sát' });
  } catch (err) {
    await ketNoi.rollback().catch(() => {});
    if (err.loaiLoi === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi nộp khảo sát' });
  } finally {
    ketNoi.release();
  }
}

module.exports = { layKhaoSatDangHoatDong, nopTraLoiKhaoSat };
