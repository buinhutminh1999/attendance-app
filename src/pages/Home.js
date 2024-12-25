import React, { useState, useCallback, useRef } from "react";
import FileUpload from "../components/FileUpload";
import AttendanceTable from "../components/AttendanceTable";
import FilterToolbar from "../components/FilterToolbar";
import PrintButton from "../components/PrintButton";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { useSnackbar } from "notistack";
import { generatePrintContent } from "../utils/printUtils";

const Home = () => {
  const [filteredData, setFilteredData] = useState([]);
  const attendanceDataRef = useRef([]);
  const { enqueueSnackbar } = useSnackbar();

  const processAttendanceData = (data) => {
    const timeToMinutes = (time) => {
      if (!time || typeof time !== "string") return null;
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    return data.map((row) => {
      const processedRow = { ...row };
      const s1Minutes = timeToMinutes(processedRow.S1);
      const s2Minutes = timeToMinutes(processedRow.S2);
      const c1Minutes = timeToMinutes(processedRow.C1);
      const c2Minutes = timeToMinutes(processedRow.C2);

      const MORNING_END = 11 * 60 + 15; // 11:15 in minutes

      // Trường hợp 1: Nếu tất cả bốn thời gian có sẵn, không làm gì
      if (s1Minutes && s2Minutes && c1Minutes && c2Minutes) {
        return processedRow;
      }

      if (s1Minutes > MORNING_END) {
        processedRow.C1 = processedRow.S1;
        processedRow.C2 = processedRow.S2;
        processedRow.S1 = "❌";
        processedRow.S2 = "❌";
      } else if (s1Minutes <= MORNING_END && s2Minutes > MORNING_END) {
        processedRow.C2 = processedRow.C1;
        processedRow.C1 = processedRow.S2;
        processedRow.S2 = "❌";
      }
      return processedRow;
    });
  };

  const handleFileUpload = useCallback(
    (data) => {
      try {
        const formattedData = data.map((row, index) => ({
          id: index + 1,
          ...row,
          Ngày: convertExcelDateToJSDate(row["Ngày"]),
          S1: convertExcelTimeToTimeString(row["S1"]),
          S2: convertExcelTimeToTimeString(row["S2"]),
          C1: convertExcelTimeToTimeString(row["C1"]),
          C2: convertExcelTimeToTimeString(row["C2"]),
        }));

        // Process attendance data based on rules
        const processedData = processAttendanceData(formattedData);

        attendanceDataRef.current = processedData;
        setFilteredData(
          processedData.map((row, index) => ({ ...row, id: index + 1 }))
        );
        enqueueSnackbar("Tải file thành công!", { variant: "success" });
      } catch (error) {
        enqueueSnackbar("Lỗi khi tải file. Vui lòng thử lại.", {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar]
  );

  const handleUpdateCell = useCallback(
    (rowId, columnName, newValue) => {
      try {
        attendanceDataRef.current = attendanceDataRef.current.map((row) =>
          row.id === rowId ? { ...row, [columnName]: newValue } : row
        );
        setFilteredData((prevData) =>
          prevData.map((row) =>
            row.id === rowId ? { ...row, [columnName]: newValue } : row
          )
        );
        enqueueSnackbar("Cập nhật thành công!", { variant: "success" });
      } catch (error) {
        enqueueSnackbar("Lỗi khi cập nhật dữ liệu. Vui lòng thử lại.", {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar]
  );

  const handleSearchChange = useCallback(
    (searchTerm) => {
      try {
        if (!searchTerm) {
          setFilteredData(
            attendanceDataRef.current.map((row, index) => ({
              ...row,
              id: index + 1,
            }))
          );
        } else {
          const lowerCaseSearchTerm = searchTerm.toLowerCase();
          const filtered = attendanceDataRef.current.filter((row) =>
            Object.values(row).some(
              (value) =>
                value &&
                value.toString().toLowerCase().includes(lowerCaseSearchTerm)
            )
          );
          setFilteredData(
            filtered.map((row, index) => ({ ...row, id: index + 1 }))
          );
        }
        enqueueSnackbar("Tìm kiếm hoàn thành!", { variant: "info" });
      } catch (error) {
        enqueueSnackbar("Lỗi khi tìm kiếm. Vui lòng thử lại.", {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar]
  );
  const getPrintContent = useCallback(() => {
    try {
      if (filteredData.length === 0) {
        enqueueSnackbar("Chưa có dữ liệu để in. Vui lòng tải file trước.", {
          variant: "warning",
        });
        return "";
      }
      const content = generatePrintContent(filteredData);
      enqueueSnackbar("Nội dung in đã được tạo!", { variant: "success" });
      return content;
    } catch (error) {
      enqueueSnackbar("Lỗi khi tạo nội dung in.", { variant: "error" });
      return "";
    }
  }, [filteredData, enqueueSnackbar]);
  return (
    <>
      <FileUpload onFileUpload={handleFileUpload} />
      <FilterToolbar onSearchChange={handleSearchChange} />
      <PrintButton printContent={getPrintContent()} />
      <AttendanceTable rows={filteredData} onCellUpdate={handleUpdateCell} />
    </>
  );
};

export default Home;
