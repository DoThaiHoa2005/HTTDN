// Bộ xuất Excel dùng chung: mọi file xuất ra có cùng phong cách (tiêu đề, bộ lọc, đóng băng dòng đầu,
// định dạng ngày/tiền, màu trạng thái, dòng tổng, thiết lập in A4).
const ExcelJS = require('exceljs');

const MAU = {
  nauDam: 'FF4A2F18', nau: 'FF8C4F2B', kem: 'FFFAF3E6', vien: 'FFD9C7AE', chu: 'FF2A1810', xam: 'FF8B6F5C',
  xanhNen: 'FFE3F2E6', xanhChu: 'FF276B3E', doNen: 'FFFBE6DF', doChu: 'FFB5402C', vangNen: 'FFFBF0D9', vangChu: 'FF8A5A00',
  xanhDuongNen: 'FFE4EEF7', xanhDuongChu: 'FF1F5C8B',
};
// Màu cho các nhãn trạng thái thường gặp
const MAU_NHAN = {
  tot: { font: MAU.xanhChu, fill: MAU.xanhNen },
  canhBao: { font: MAU.vangChu, fill: MAU.vangNen },
  xau: { font: MAU.doChu, fill: MAU.doNen },
  thongTin: { font: MAU.xanhDuongChu, fill: MAU.xanhDuongNen },
};

const DINH_DANG = {
  chuoi: '@', sdt: '@', so: '#,##0', tien: '#,##0" ₫"', diem: '0.0', diem2: '0.00', phanTram: '0.0%',
  ngay: 'dd/mm/yyyy', ngayGio: 'dd/mm/yyyy hh:mm',
};
const CANH_MAC_DINH = { stt: 'center', sdt: 'center', so: 'center', tien: 'right', diem: 'center', diem2: 'center', phanTram: 'center', ngay: 'center', ngayGio: 'center' };

// Ngày giờ -> số serial của Excel, theo giờ địa phương của máy chủ (tránh lệch múi giờ)
function soSerial(giaTri) {
  if (!giaTri) return null;
  const d = giaTri instanceof Date ? giaTri : new Date(giaTri);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - Date.UTC(1899, 11, 30)) / 86400000;
}

function chuCot(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function dinhDangNgayGio(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function taoWorkbook({ tieuDe, nguoiXuat }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Cafe CRM';
  wb.lastModifiedBy = nguoiXuat || 'Cafe CRM';
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = tieuDe;
  wb.subject = 'Báo cáo xuất từ hệ thống Cafe CRM';
  wb.company = 'Quán cà phê';
  return wb;
}

const VIEN = { style: 'thin', color: { argb: MAU.vien } };
const KHUNG = { top: VIEN, left: VIEN, bottom: VIEN, right: VIEN };

/**
 * Thêm một sheet dạng bảng.
 * opts: {
 *   ten, tieuDe, dong: [chuỗi mô tả/bộ lọc...],
 *   cot: [{ header, width, kieu, canh, wrap, tong, lay(item, idx), mau(giaTri, item) }],
 *   hang: [...], khongLoc, khongTong, nhanTong, kieuO(item, cot) -> kiểu riêng cho từng ô
 * }
 * Trả về số dòng dữ liệu.
 */
function themSheet(wb, opts) {
  const { ten, tieuDe, dong = [], cot, hang, khongLoc = false, khongTong = false, nhanTong = 'Tổng cộng', kieuO } = opts;
  const ws = wb.addWorksheet(ten.slice(0, 31), { properties: { tabColor: { argb: MAU.nau } } });
  const soCot = cot.length;
  let r = 1;

  // --- Tiêu đề ---
  ws.mergeCells(r, 1, r, soCot);
  const o1 = ws.getCell(r, 1);
  o1.value = tieuDe;
  o1.font = { name: 'Calibri', size: 17, bold: true, color: { argb: MAU.nauDam } };
  o1.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(r).height = 30;
  for (let c = 1; c <= soCot; c++) ws.getCell(r, c).border = { bottom: { style: 'medium', color: { argb: MAU.nau } } };
  r++;
  const cacDong = [`Quán cà phê — Hệ thống Cafe CRM`, ...dong];
  for (const t of cacDong) {
    ws.mergeCells(r, 1, r, soCot);
    const o = ws.getCell(r, 1);
    o.value = t;
    o.font = { name: 'Calibri', size: 10, italic: true, color: { argb: MAU.xam } };
    o.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    r++;
  }
  ws.getRow(r).height = 8;
  r++;

  // --- Dòng tiêu đề cột ---
  const hr = r;
  cot.forEach((c, i) => {
    const o = ws.getCell(hr, i + 1);
    o.value = c.header;
    o.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAU.nauDam } };
    o.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    o.border = KHUNG;
    ws.getColumn(i + 1).width = c.width || 16;
  });
  ws.getRow(hr).height = 32;
  r++;

  // --- Dữ liệu ---
  hang.forEach((item, idx) => {
    const row = ws.getRow(r);
    cot.forEach((c, i) => {
      const o = row.getCell(i + 1);
      const kieu = (kieuO && kieuO(item, c)) || c.kieu || 'chuoi';
      let v = c.lay ? c.lay(item, idx) : item[c.key];
      if (kieu === 'stt') v = idx + 1;
      if (kieu === 'ngay' || kieu === 'ngayGio') v = soSerial(v);
      else if (kieu === 'sdt') v = v == null ? '' : String(v);
      else if (['so', 'tien', 'diem', 'diem2', 'phanTram'].includes(kieu)) v = v == null || v === '' ? null : Number(v);
      else if (kieu === 'lienKet') {
        v = v ? String(v) : '';
        if (/^https?:\/\//i.test(v)) v = { text: v, hyperlink: v };
      } else v = v == null ? '' : String(v);
      o.value = v;
      o.numFmt = kieu === 'stt' ? '0' : (DINH_DANG[kieu] || '@');
      const canh = c.canh || CANH_MAC_DINH[kieu] || 'left';
      o.alignment = { vertical: c.wrap ? 'top' : 'middle', horizontal: canh, wrapText: !!c.wrap, indent: canh === 'left' ? 1 : 0 };
      o.font = { name: 'Calibri', size: 11, color: { argb: kieu === 'lienKet' ? MAU.xanhDuongChu : MAU.chu }, bold: !!c.dam, underline: kieu === 'lienKet' && v ? true : undefined };
      o.border = KHUNG;
      if (idx % 2 === 1) o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAU.kem } };
      if (c.mau) {
        const m = c.mau(item[c.key] !== undefined ? item[c.key] : v, item);
        if (m) {
          o.font = { ...o.font, color: { argb: m.font }, bold: true };
          o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.fill } };
        }
      }
    });
    r++;
  });

  const cuoi = r - 1;

  // --- Dòng tổng ---
  if (!khongTong && hang.length > 0) {
    const cotTong = cot.map((c, i) => (c.tong ? i + 1 : 0)).filter(Boolean);
    const dauTong = cotTong.length ? cotTong[0] : soCot + 1;
    const nhanCuoi = Math.max(1, dauTong - 1);
    ws.mergeCells(r, 1, r, nhanCuoi);
    const o = ws.getCell(r, 1);
    o.value = `${nhanTong}: ${hang.length.toLocaleString('vi-VN')} bản ghi`;
    o.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= soCot; c++) {
      const oc = ws.getCell(r, c);
      oc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: MAU.nauDam } };
      oc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFDFC8' } };
      oc.border = { top: { style: 'medium', color: { argb: MAU.nau } }, bottom: VIEN, left: VIEN, right: VIEN };
    }
    cot.forEach((c, i) => {
      if (!c.tong) return;
      const oc = ws.getCell(r, i + 1);
      const col = chuCot(i + 1);
      const tongSo = hang.reduce((s, it, k) => s + (Number(c.lay ? c.lay(it, k) : it[c.key]) || 0), 0);
      oc.value = { formula: `SUBTOTAL(109,${col}${hr + 1}:${col}${cuoi})`, result: tongSo };
      oc.numFmt = DINH_DANG[c.kieu] || '#,##0';
      oc.alignment = { vertical: 'middle', horizontal: CANH_MAC_DINH[c.kieu] || 'center' };
    });
    ws.getRow(r).height = 22;
  }

  // --- Cố định dòng đầu, bộ lọc, in ấn ---
  ws.views = [{ state: 'frozen', ySplit: hr, showGridLines: false }];
  if (!khongLoc && hang.length > 0) ws.autoFilter = { from: { row: hr, column: 1 }, to: { row: cuoi, column: soCot } };
  ws.pageSetup = {
    paperSize: 9, orientation: soCot > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 }, printTitlesRow: `${hr}:${hr}`,
  };
  ws.headerFooter = { oddFooter: '&L&"Calibri,Italic"&9Cafe CRM&C&"Calibri,Regular"&9Trang &P / &N&R&"Calibri,Italic"&9&D' };
  return hang.length;
}

// Gửi workbook về trình duyệt dưới dạng file tải xuống
async function guiExcel(res, wb, tenKhongDau, soDong) {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  const ten = `${tenKhongDau}_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${ten}"; filename*=UTF-8''${encodeURIComponent(ten)}`);
  res.setHeader('X-Tong-So-Dong', String(soDong));
  res.setHeader('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
  res.end();
}

module.exports = { MAU, MAU_NHAN, taoWorkbook, themSheet, guiExcel, dinhDangNgayGio };
