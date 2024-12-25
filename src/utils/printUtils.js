/**
 * Tạo nội dung in ấn cho từng bộ phận
 * @param {Array} filteredData - Dữ liệu đã lọc
 * @returns {string} Nội dung HTML cho tất cả các bộ phận
 */
import { isLate } from "./timeUtils";

export const generatePrintContent = (filteredData) => {
  const departments = Array.from(
    new Set(filteredData.map((row) => row["TÊN BỘ PHẬN"]))
  );
  return departments
    .map((department, index) => {
      const departmentData = filteredData
        .filter((row) => row["TÊN BỘ PHẬN"] === department)
        .map((row, index) => ({ ...row, id: index + 1 }));

      return `
        ${index > 0 ? `<div style="page-break-before: always;"></div>` : ""}
        <h1 style="text-align: center; font-size: 24px; font-weight: bold;">
          Bảng công từ ngày ${departmentData[0]?.["Ngày"] || ""} đến ngày ${
        departmentData[departmentData.length - 1]?.["Ngày"] || ""
      } - Bộ phận: ${department}
        </h1>
        ${generateTable(departmentData)} 
        ${generateSignSection(departmentData.length > 0)}
      `;
    })
    .join("");
};

/**
 * Tạo bảng dữ liệu cho in ấn
 * @param {Array} departmentData - Dữ liệu của từng bộ phận
 * @returns {string} Nội dung HTML của bảng
 */
const generateTable = (departmentData) => `
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Times New Roman', serif;">
    <thead>
      <tr>
        <th>STT</th>
        <th>Tên nhân viên</th>
        <th>Ngày</th>
        <th>Thứ</th>
        <th>S1</th>
        <th>S2</th>
        <th>Lý do đi trễ (Sáng)</th>
        <th>C1</th>
        <th>C2</th>
        <th>Lý do đi trễ (Chiều)</th>
      </tr>
    </thead>
    <tbody>
      ${departmentData
        .map(
          (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${row["TÊN NHÂN VIÊN"] || "❌"}</td>
            <td>${row["Ngày"] || "❌"}</td>
            <td>${row["Thứ"] || "❌"}</td>
            <td style="background-color: ${
              isLate(row["S1"], 7 * 60 + 15) ? "#FFCCCB" : "transparent"
            };">
              ${row["S1"] || "❌"}
            </td>
            <td style="background-color: ${
              isLate(row["S2"], 7 * 60 + 15) ? "#FFCCCB" : "transparent"
            };">
              ${row["S2"] || "❌"}
            </td>
            <td style="border-bottom: 1px dashed #000; width: 20%;"></td>
            <td style="background-color: ${
              isLate(row["C1"], 13 * 60) ? "#FFCCCB" : "transparent"
            };">
              ${row["C1"] || "❌"}
         <td style="background-color: ${
           row["C2"]};">
  ${row["C2"] || "❌"}
</td>


            <td style="border-bottom: 1px dashed #000; width: 20%;"></td>
          </tr>
        `
        )
        .join("")}
    </tbody>
  </table>
  <p style="font-size: 12px; margin-top: 10px;">
    <strong>Ghi chú:</strong> 
    ❌: Chưa ghi nhận dữ liệu chấm công | 
    S1, S2: Chấm công sáng | C1, C2: Chấm công chiều.
  </p>
`;
/**
 * Tạo phần xác nhận của lãnh đạo và người lập
 * @param {boolean} hasData - Xác định xem có dữ liệu cho bộ phận hay không
 * @returns {string} Nội dung HTML của phần xác nhận
 */
const generateSignSection = (hasData) =>
  hasData
    ? `
    <div style="display: flex; justify-content: space-between; margin-top: 50px;">
      <div style="text-align: center; width: 40%;">
        <p style="font-size: 16px; font-weight: bold;">Xác nhận của lãnh đạo bộ phận</p>
      </div>
      <div style="text-align: center; width: 40%;">
        <p style="font-size: 16px; font-weight: bold;">Người lập</p>
      </div>
    </div>
  `
    : "";
