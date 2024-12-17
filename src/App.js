import React, { useMemo, useState, useCallback } from "react";
import { debounce } from "lodash";
import * as XLSX from "xlsx";
import {
  Select,
  MenuItem,
  Container,
  Box,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AttendanceTable from "./components/AttendanceTable";
import PrintButtons from "./components/PrintAllButtons";
import { printDepartment } from "./utils/printing/printDepartment";
import { printAllDepartments } from "./utils/printing/printAllDepartments";
const App = () => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // Trạng thái của hộp thoại xóa

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false); // Trạng thái tải tệp
  const [snackbarMessage, setSnackbarMessage] = useState(""); // Thông báo tải

  const groupedData = useMemo(() => {
    return data.reduce((acc, row) => {
      const department = row["TÊN BỘ PHẬN"] || "Chưa xác định";
      if (!acc[department]) acc[department] = [];
      acc[department].push(row);
      return acc;
    }, {});
  }, [data]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  const convertExcelDate = (excelDate) =>
    new Date((excelDate - 25569) * 86400 * 1000);

  const convertExcelTime = (excelTime) => {
    if (!excelTime) return "Chưa ghi nhận";
    const totalSeconds = Math.round(excelTime * 86400);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    return `${hours}:${minutes}`;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setSnackbarMessage("Vui lòng tải lên tệp Excel (.xlsx hoặc .xls)");
      return;
    }

    setLoading(true); // Bắt đầu tải
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "binary" });
        const sheetData = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]]
        );

        const processedData = sheetData.map((row) => ({
          ...row,
          Ngày: convertExcelDate(row["Ngày"]),
          S1: convertExcelTime(row["S1"]),
          S2: convertExcelTime(row["S2"]),
          C1: convertExcelTime(row["C1"]),
          C2: convertExcelTime(row["C2"]),
        }));

        setData(processedData);
        setSnackbarMessage("Dữ liệu đã được tải lên thành công!");
      } catch (error) {
        setSnackbarMessage("Lỗi phân tích tệp. Vui lòng kiểm tra lại tệp.");
      } finally {
        setLoading(false); // Dừng tải
      }
    };

    reader.readAsBinaryString(file);
  };

  // Hàm để lọc dữ liệu (kết hợp tìm kiếm và lọc bộ phận)
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const employeeName = row["TÊN NHÂN VIÊN"]
        ? row["TÊN NHÂN VIÊN"].toLowerCase()
        : "";
      const departmentName = row["TÊN BỘ PHẬN"]
        ? row["TÊN BỘ PHẬN"].toLowerCase()
        : "";
      const searchText = searchTerm.toLowerCase();

      // Kiểm tra tìm kiếm (theo tên nhân viên hoặc tên bộ phận)
      const matchesSearch =
        employeeName.includes(searchText) ||
        departmentName.includes(searchText);

      // Kiểm tra bộ lọc tên bộ phận (nếu người dùng chọn bộ phận)
      const matchesDepartment =
        !filterDepartment || row["TÊN BỘ PHẬN"] === filterDepartment;

      // Chỉ bao gồm các hàng khớp với cả tìm kiếm và bộ phận
      return matchesSearch && matchesDepartment;
    });
  }, [data, searchTerm, filterDepartment]);

  // Hàm chỉ cho phép chỉnh sửa các cột S1, S2, C1, C2
  const handleEdit = (index, field, value) => {
    const editableFields = ["S1", "S2", "C1", "C2"];

    if (!editableFields.includes(field)) {
      console.warn(`Không thể chỉnh sửa cột: ${field}`);
      return;
    }

    setData((prevData) => {
      const updatedData = [...prevData];
      updatedData[index][field] = value;
      return updatedData;
    });
  };

  const debouncedSetSearchTerm = useCallback(
    debounce((value) => setSearchTerm(value), 300), // 300ms delay
    []
  );

  const exportFilteredDataToExcel = (filteredData) => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FilteredData");
    XLSX.writeFile(workbook, "FilteredData.xlsx");
  };

  const openDeleteDialog = () => setIsDeleteDialogOpen(true);
  const closeDeleteDialog = () => setIsDeleteDialogOpen(false);
  const handleDeleteData = () => {
    setData([]); // Xóa toàn bộ dữ liệu
    setSnackbarMessage("Dữ liệu đã được xóa thành công!");
    closeDeleteDialog(); // Đóng hộp thoại xác nhận
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Ứng dụng tính bảng công
      </Typography>
      {loading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          position="fixed"
          top={0}
          left={0}
          width="100%"
          height="100%"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.8)", zIndex: 9999 }}
        >
          <CircularProgress size={60} />
        </Box>
      )}

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage("")}
        message={snackbarMessage}
      />

      {/* Nút Xóa tất cả dữ liệu */}
      <Box my={2}>
        <Button variant="contained" color="error" onClick={openDeleteDialog}>
          Xóa tất cả dữ liệu
        </Button>
      </Box>

      {/* Hộp thoại xác nhận xóa */}
      <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Xác nhận xóa dữ liệu</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể
            hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="primary">
            Hủy
          </Button>
          <Button onClick={handleDeleteData} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Box display="flex" justifyContent="space-between" my={2}>
        <Button
          variant="contained"
          color="primary"
          component="label"
          disabled={loading}
        >
          Tải lên tệp
          <input type="file" hidden onChange={handleFileUpload} />
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={() => exportFilteredDataToExcel(filteredData)}
        >
          Tải xuống dữ liệu đã lọc
        </Button>
      </Box>

      <Box my={2} display="flex" justifyContent="space-between">
        <PrintButtons
          printAllDepartments={() => printAllDepartments(groupedData)} // Truyền groupedData
          groupedData={groupedData}
          printDepartment={(department) =>
            printDepartment(department, groupedData)
          } // Truyền groupedData khi gọi hàm
        />
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

      <AttendanceTable filteredData={filteredData} handleEdit={handleEdit} />

      <ToastContainer />
    </Container>
  );
};

export default App;
