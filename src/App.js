import React, { useState } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Container,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  const convertExcelDate = (excelDate) => {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
  };

  const convertExcelTime = (excelTime) => {
    if (!excelTime) return "Chưa ghi nhận";
    const totalSeconds = Math.round(excelTime * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

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
      toast.success("Dữ liệu đã được tải lên thành công!");
    };

    reader.readAsBinaryString(file);
  };

  const getFilteredData = () => {
    const filteredData = data.filter((row) => {
      const matchesSearch =
        row["TÊN NHÂN VIÊN"]
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        row["TÊN BỘ PHẬN"]?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        !filterDepartment || row["TÊN BỘ PHẬN"] === filterDepartment;

      return matchesSearch && matchesDepartment;
    });

    return filteredData;
  };

  // Hàm in một bộ phận
  const printDepartment = (department) => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) {
      alert(
        "Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt trình duyệt của bạn."
      );
      return;
    }

    const departmentData = groupedData[department];
    const startDate = departmentData[0]["Ngày"];
    const endDate = departmentData[departmentData.length - 1]["Ngày"];
    const startFormatted = format(new Date(startDate), "dd/MM/yyyy");
    const endFormatted = format(new Date(endDate), "dd/MM/yyyy");

    // Nội dung in
    let content =
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
    </div>`;

    // Chèn CSS vào cửa sổ in
    printWindow.document.write(`
    <html>
      <head>
        <title>In bộ phận: ${department}</title>
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

    // Hoàn tất in
    printWindow.document.close();
    printWindow.print();
  };

  const printAllDepartments = () => {
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
      const startDate = departmentData[0]["Ngày"];
      const endDate = departmentData[departmentData.length - 1]["Ngày"];
      const startFormatted = format(new Date(startDate), "dd/MM/yyyy");
      const endFormatted = format(new Date(endDate), "dd/MM/yyyy");

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

    // Chèn CSS vào cửa sổ in
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

    // Hoàn tất in
    printWindow.document.close();
    printWindow.print();
  };

  const handleEdit = (index, field, value) => {
    const updatedData = [...data];
    updatedData[index][field] = value;
    setData(updatedData);
  };

  return (
    <Container>
      <h1>Ứng dụng tính bảng công</h1>
      <Box my={2}>
        <Button variant="contained" component="label">
          Tải lên file Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            hidden
          />
        </Button>
      </Box>

      <Box my={2}>
        <TextField
          label="Tìm kiếm"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      <Box my={2} display="flex" justifyContent="space-between">
        <Button
          variant="contained"
          className="button-group"
          onClick={printAllDepartments}
        >
          In tất cả bộ phận
        </Button>

        {Object.keys(groupedData).map((department) => (
          <Button
            className="button-group"
            variant="contained"
            onClick={() => printDepartment(department)}
            key={department}
            style={{ marginLeft: 10 }} // Adds space between the buttons
          >
            In bộ phận: {department}
          </Button>
        ))}
      </Box>

      <Box my={2}>
        <Select
          fullWidth
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <MenuItem value="">Tất cả bộ phận</MenuItem>
          {Object.keys(groupedData).map((department) => (
            <MenuItem key={department} value={department}>
              {department}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Tên nhân viên</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Thứ</TableCell>
              <TableCell>S1</TableCell>
              <TableCell>S2</TableCell>
              <TableCell>C1</TableCell>
              <TableCell>C2</TableCell>
              <TableCell>Tên bộ phận</TableCell> {/* Thêm cột "Tên bộ phận" */}
            </TableRow>
          </TableHead>
          <TableBody>
  {getFilteredData().map((row, idx) => (
    <TableRow key={idx}>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{row["TÊN NHÂN VIÊN"] || "N/A"}</TableCell>
      <TableCell>
        {row["Ngày"] instanceof Date
          ? format(row["Ngày"], "dd/MM/yyyy")
          : "N/A"}
      </TableCell>
      <TableCell>{row["Thứ"] || "N/A"}</TableCell>
      <TableCell>
        <TextField
          value={row["S1"] || ""}
          onChange={(e) => handleEdit(idx, "S1", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell>
        <TextField
          value={row["S2"] || ""}
          onChange={(e) => handleEdit(idx, "S2", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell>
        <TextField
          value={row["C1"] || ""}
          onChange={(e) => handleEdit(idx, "C1", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell>
        <TextField
          value={row["C2"] || ""}
          onChange={(e) => handleEdit(idx, "C2", e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell>{row["TÊN BỘ PHẬN"] || "N/A"}</TableCell> {/* Thêm cột "Tên bộ phận" */}
    </TableRow>
  ))}
</TableBody>

        </Table>
      </TableContainer>

      <ToastContainer />
    </Container>
  );
};

export default App;
