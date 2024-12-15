import React, { useState } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import "./App.css"; // Đảm bảo bạn đã import App.css

const App = () => {
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Hàm chuyển đổi số Excel thành định dạng ngày tháng
  const convertExcelDate = (excelDate) => {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
  };

  // Hàm chuyển đổi số Excel thành giờ (hh:mm:ss)
  const convertExcelTime = (excelTime) => {
    if (!excelTime) return "Chưa ghi nhận";
    const totalSeconds = Math.round(excelTime * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Hàm phân nhóm dữ liệu theo phòng ban
  const groupByDepartment = (data) => {
    const grouped = data.reduce((acc, row) => {
      const department = row["TÊN BỘ PHẬN"] || "Chưa xác định";
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(row);
      return acc;
    }, {});
    setGroupedData(grouped);
  };

  // Xử lý khi upload file Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      // Chuyển đổi dữ liệu
      const processedData = sheetData.map((row) => ({
        ...row,
        Ngày: convertExcelDate(row["Ngày"]),
        S1: convertExcelTime(row["S1"]),
        S2: convertExcelTime(row["S2"]),
        C1: convertExcelTime(row["C1"]),
        C2: convertExcelTime(row["C2"]),
      }));

      setData(processedData);
      groupByDepartment(processedData);
    };

    reader.readAsBinaryString(file);
  };

  // Hàm lọc dữ liệu theo từ khóa tìm kiếm
  const filteredData = Object.keys(groupedData).reduce((acc, department) => {
    acc[department] = groupedData[department].filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    return acc;
  }, {});

  // Hàm in bảng chấm công cho từng bộ phận
  const printDepartmentAttendance = (department) => {
    const departmentData = groupedData[department];
    const startDate = departmentData[0]["Ngày"];
    const endDate = departmentData[departmentData.length - 1]["Ngày"];

    const startFormatted = format(new Date(startDate), "MM/dd/yyyy");
    const endFormatted = format(new Date(endDate), "MM/dd/yyyy");

    const printWindow = window.open("", "", "width=800,height=600");

    printWindow.document.write("<html><head><title>In bảng chấm công</title>");
    printWindow.document.write(`
      <style>
        body {
          font-family: Arial, sans-serif;
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
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        td {
          text-align: center;
        }
        .department-title {
          font-size: 1.2em;
          margin-top: 30px;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: left;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    `);
    printWindow.document.write("</head><body>");

    printWindow.document.write(`<div class="department-title">Bảng công từ ngày ${startFormatted} đến ngày ${endFormatted} - Bộ phận: ${department}</div>`);
    printWindow.document.write(`
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên nhân viên</th>
            <th>Ngày</th>
            <th>Thứ</th>
            <th>S1</th>
            <th>S2</th>
            <th>C1</th>
            <th>C2</th>
            <th>Lý do đi trễ</th>
          </tr>
        </thead>
        <tbody>
          ${departmentData.map((row, idx) => {
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${row["TÊN NHÂN VIÊN"] || "N/A"}</td>
                <td>${row["Ngày"] instanceof Date && !isNaN(row["Ngày"]) ? format(row["Ngày"], "dd/MM/yyyy") : "N/A"}</td>
                <td>${row["Thứ"] || "N/A"}</td>
                <td>${row["S1"] || "Chưa ghi nhận"}</td>
                <td>${row["S2"] || "Chưa ghi nhận"}</td>
                <td>${row["C1"] || "Chưa ghi nhận"}</td>
                <td>${row["C2"] || "Chưa ghi nhận"}</td>
                <td></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `);

    // Thêm thông tin chữ ký sau mỗi bộ phận
    printWindow.document.write(`
      <div class="footer">
        <div>Xác nhận của lãnh đạo bộ phận: _____________________</div>
        <div>Người lập: _____________________</div>
      </div>
    `);

    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  // Hàm in bảng chấm công cho tất cả bộ phận
  const printAllDepartmentsAttendance = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write("<html><head><title>In bảng chấm công</title>");
    printWindow.document.write(`
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        td {
          text-align: center;
        }
        .department-title {
          font-size: 1.2em;
          margin-top: 30px;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: left;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    `);
    printWindow.document.write("</head><body>");

    // Lặp qua các bộ phận và in cho từng bộ phận
    Object.keys(filteredData).forEach(department => {
      if (filteredData[department].length > 0) {
        printWindow.document.write(`<div class="department-title">Bảng công - Bộ phận: ${department}</div>`);
        printWindow.document.write(`
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên nhân viên</th>
                <th>Ngày</th>
                <th>Thứ</th>
                <th>S1</th>
                <th>S2</th>
                <th>C1</th>
                <th>C2</th>
                <th>Lý do đi trễ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData[department].map((row, idx) => {
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${row["TÊN NHÂN VIÊN"] || "N/A"}</td>
                    <td>${row["Ngày"] instanceof Date && !isNaN(row["Ngày"]) ? format(row["Ngày"], "dd/MM/yyyy") : "N/A"}</td>
                    <td>${row["Thứ"] || "N/A"}</td>
                    <td>${row["S1"] || "Chưa ghi nhận"}</td>
                    <td>${row["S2"] || "Chưa ghi nhận"}</td>
                    <td>${row["C1"] || "Chưa ghi nhận"}</td>
                    <td>${row["C2"] || "Chưa ghi nhận"}</td>
                    <td></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `);
        printWindow.document.write('<div class="page-break"></div>');
      }
    });

    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="App">
      <h1>Ứng dụng Chấm Công</h1>
      <input type="file" onChange={handleFileUpload} />
      <div className="search-container">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="buttons-container">
        <button onClick={printAllDepartmentsAttendance}>In tất cả bộ phận</button>
        {Object.keys(filteredData).map((department) => (
          <button key={department} onClick={() => printDepartmentAttendance(department)}>
            In bảng chấm công - {department}
          </button>
        ))}
      </div>

      {/* Table for displaying data */}
      {data.length > 0 && (
        <div className="table-container">
          {Object.keys(filteredData).map((department) => (
            <div key={department}>
              <h3>{department}</h3>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên nhân viên</th>
                    <th>Ngày</th>
                    <th>Thứ</th>
                    <th>S1</th>
                    <th>S2</th>
                    <th>C1</th>
                    <th>C2</th>
                    <th>Lý do đi trễ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData[department].map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{row["TÊN NHÂN VIÊN"] || "N/A"}</td>
                      <td>{row["Ngày"] instanceof Date && !isNaN(row["Ngày"]) ? format(row["Ngày"], "dd/MM/yyyy") : "N/A"}</td>
                      <td>{row["Thứ"] || "N/A"}</td>
                      <td>{row["S1"] || "Chưa ghi nhận"}</td>
                      <td>{row["S2"] || "Chưa ghi nhận"}</td>
                      <td>{row["C1"] || "Chưa ghi nhận"}</td>
                      <td>{row["C2"] || "Chưa ghi nhận"}</td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
