import { format } from "date-fns";

export const printAllDepartments = (groupedData) => {
  if (!groupedData || Object.keys(groupedData).length === 0) {
    alert("Không có dữ liệu nào để in.");
    return;
  }

  const printWindow = window.open("", "", "width=800,height=600");
  if (!printWindow) {
    alert(
      "Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt trình duyệt của bạn."
    );
    return;
  }

  let content = "";
  const departmentKeys = Object.keys(groupedData);

  departmentKeys.forEach((department, index) => {
    const departmentData = groupedData[department];
    if (!departmentData || departmentData.length === 0) {
      return;
    }

    const startDate = departmentData[0]?.["Ngày"];
    const endDate = departmentData[departmentData.length - 1]?.["Ngày"];
    const startFormatted = startDate
      ? format(new Date(startDate), "dd/MM/yyyy")
      : "N/A";
    const endFormatted = endDate
      ? format(new Date(endDate), "dd/MM/yyyy")
      : "N/A";

    content +=
      `<div class="department-title">` +
      `Bảng công từ ngày ${startFormatted} đến ngày ${endFormatted} - Bộ phận: ${department}` +
      `</div>` +
      `<table>
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 15%;">Tên nhân viên</th>
              <th style="width: 10%;">Ngày</th>
              <th style="width: 10%;">Thứ</th>
              <th style="width: 8%;">S1</th>
              <th style="width: 8%;">S2</th>
              <th style="width: 8%;">C1</th>
              <th style="width: 8%;">C2</th>
              <th style="width: 28%;">Lý do đi trễ</th>
            </tr>
          </thead>
          <tbody>
            ${departmentData
              .map((row, idx) => {
                return `<tr>
                    <td>${idx + 1}</td>
                    <td>${row["TÊN NHÂN VIÊN"] || "N/A"}</td>
                    <td>${
                      row["Ngày"] instanceof Date && !isNaN(row["Ngày"])
                        ? format(row["Ngày"], "dd/MM/yyyy")
                        : "N/A"
                    }</td>

                    <td>${row["Thứ"] || "N/A"}</td>
                    <td>${row["S1"] || "Chưa ghi nhận"}</td>
                    <td>${row["S2"] || "Chưa ghi nhận"}</td>
                    <td>${row["C1"] || "Chưa ghi nhận"}</td>
                    <td>${row["C2"] || "Chưa ghi nhận"}</td>
                    <td></td>
                  </tr>`;
              })
              .join("")}
          </tbody>
        </table>` +
      `<div class="footer">
          <div class="footer-section">
            <span>Xác nhận của lãnh đạo bộ phận</span>
            <div class="line"></div>
          </div>
          <div class="footer-section">
            <span>Người lập</span>
            <div class="line"></div>
          </div>
        </div>` +
      (index < departmentKeys.length - 1
        ? `<div style="page-break-before: always;"></div>`
        : "");
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>In bảng công</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            padding: 20px;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
          }
          th {
            font-size: 14px;
          }
          td {
            font-size: 13px;
          }
          .department-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-top: 20px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            font-size: 13px;
          }
          .footer-section {
            width: 48%;
            text-align: center;
          }
          .footer-section .line {
            margin-top: 30px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
};
