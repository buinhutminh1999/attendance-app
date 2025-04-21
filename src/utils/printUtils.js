// src/utils/printUtils.js

import { isLate, isEarly, isTimeString } from "./timeUtils";

const WEEKDAYS = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

/**
 * In bảng chấm công với style.
 * @param {Array} rowsToPrint – mảng các bản ghi đã filter
 * @param {string} dept – tên bộ phận đang in
 */
export function printStyledAttendance(rowsToPrint, dept) {
  if (!rowsToPrint.length) return;

  const firstDate = rowsToPrint[0].Ngày;
  const lastDate = rowsToPrint[rowsToPrint.length - 1].Ngày;
  const title = `Bảng công từ ngày ${firstDate} đến ngày ${lastDate} – Bộ phận: ${dept}`;

  const style = `
    <style>
      @page { size: A4 landscape; margin: 20px; }
      body { font-family: "Times New Roman", serif; }
      h1 { 
        text-align: center; 
        margin-bottom: 16px; 
        font-size: 24px;        /* tăng kích thước tiêu đề */
        font-weight: bold;
      }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        border: 1px solid #000;
        padding: 6px;
        text-align: center;
        font-size: 12px;
      }
      th { background: #f2f2f2; }
      .late { background: #FFCCCC; } /* highlight ô trễ/đến sớm */
      .no-data { color: #999; }     /* dấu “—” thứ Bảy */
      .signature {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
      }
      .signature div {
        width: 40%;
        text-align: center;
      }
      .signature p {
        font-weight: bold;
        margin-bottom: 60px;
      }
      .note {
        font-size: 12px;
        margin-top: 10px;
      }
    </style>
  `;

  const rowsHtml = rowsToPrint.map((r, i) => {
    const [dd, mm, yyyy] = r.Ngày.split("/").map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    const weekday = WEEKDAYS[d.getDay()];
    const isSat = d.getDay() === 6;

    const s1 = r.S1 || "";
    const s2 = r.S2 || "";
    const c1 = r.C1 || "";
    const c2 = r.C2 || "";
    const m = (r.morning || "").trim();
    const a = (r.afternoon || "").trim();

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${r["Tên nhân viên"]}</td>
        <td>${r.Ngày}</td>
        <td>${weekday}</td>

        <!-- S1: highlight nếu sau 07:15 -->
        <td class="${isTimeString(s1) && isLate(s1, 7*60+15) ? "late" : ""}">
          ${s1 || "❌"}
        </td>

        <!-- S2: highlight nếu trước 11:15 -->
        <td class="${isTimeString(s2) && isEarly(s2, 11*60+15) ? "late" : ""}">
          ${s2 || "❌"}
        </td>

        <!-- Lý do Sáng -->
        <td>${m}</td>

        <!-- C1: thứ Bảy luôn hiện “—” -->
        <td class="${!isSat && isTimeString(c1) && isLate(c1, 13*60) ? "late" : ""}">
          ${isSat ? "—" : (c1 || "❌")}
        </td>

        <!-- C2: thứ Bảy luôn hiện “—” -->
        <td class="${!isSat && isTimeString(c2) && isEarly(c2, 17*60) ? "late" : ""}">
          ${isSat ? "—" : (c2 || "❌")}
        </td>

        <!-- Lý do Chiều -->
        <td>${isSat ? "—" : a}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <html>
      <head>
        <title>In bảng chấm công</title>
        ${style}
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên nhân viên</th>
              <th>Ngày</th>
              <th>Thứ</th>
              <th>S1</th>
              <th>S2</th>
              <th>Lý do trễ (Sáng)</th>
              <th>C1</th>
              <th>C2</th>
              <th>Lý do trễ (Chiều)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p class="note">
          <strong>Ghi chú:</strong>
          ❌: Chưa ghi nhận dữ liệu chấm công | 
          S1, S2: Chấm công sáng | C1, C2: Chấm công chiều.
        </p>
        <div class="signature">
          <div><p>Xác nhận lãnh đạo</p></div>
          <div><p>Người lập</p></div>
        </div>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.onafterprint = () => win.close();
}
