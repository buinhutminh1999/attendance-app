import React, { memo, useCallback, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { isLate, isValidTime } from "../utils/timeUtils";
import { useSnackbar } from "notistack";

const validateNewValue = (fieldName, newValue, enqueueSnackbar) => {
  if (!newValue) {
    enqueueSnackbar("Giá trị không được để trống.", { variant: "error" });
    return false;
  }
  if (["S1", "S2", "C1", "C2"].includes(fieldName)) {
    if (!isValidTime(newValue)) {
      enqueueSnackbar(
        `Giờ nhập cho cột ${fieldName} không hợp lệ. Vui lòng nhập lại theo định dạng hh:mm.`,
        {
          variant: "error",
        }
      );
      return false;
    }
  }
  return true;
};

const updateRowData = (newRow, fieldName, onCellUpdate, enqueueSnackbar) => {
  try {
    if (typeof onCellUpdate === "function") {
      onCellUpdate(newRow.id, fieldName, newRow[fieldName]);
      enqueueSnackbar("Cập nhật thành công!", { variant: "success" });
    } else {
      enqueueSnackbar("Không thể cập nhật dữ liệu do lỗi hệ thống.", {
        variant: "error",
      });
    }
  } catch (error) {
    enqueueSnackbar("Lỗi khi cập nhật dữ liệu. Vui lòng thử lại.", {
      variant: "error",
    });
  }
};

const AttendanceTable = memo(({ rows, onCellUpdate }) => {
  const [selectedDepartment, setSelectedDepartment] = useState("Tất cả");
  const [filteredRows, setFilteredRows] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  const handleProcessRowUpdate = useCallback(
    (newRow, oldRow) => {
      try {
        const updatedRow = { ...newRow };
        const fieldName = Object.keys(newRow).find(
          (key) => newRow[key] !== oldRow[key]
        );

        if (fieldName) {
          const isValid = validateNewValue(
            fieldName,
            newRow[fieldName],
            enqueueSnackbar
          );
          if (!isValid) return oldRow;

          updateRowData(updatedRow, fieldName, onCellUpdate, enqueueSnackbar);
        }

        return updatedRow;
      } catch (error) {
        enqueueSnackbar("Lỗi khi cập nhật dữ liệu. Vui lòng thử lại.", {
          variant: "error",
        });
        return oldRow;
      }
    },
    [onCellUpdate, enqueueSnackbar]
  );

  useMemo(() => {
    const filtered =
      selectedDepartment === "Tất cả"
        ? rows
        : rows.filter((row) => row["TÊN BỘ PHẬN"] === selectedDepartment);
    setFilteredRows(filtered.map((row, index) => ({ ...row, id: index + 1 })));
  }, [selectedDepartment, rows]);

  const columns = [
    { field: "id", headerName: "STT", width: 70 },
    {
      field: "TÊN NHÂN VIÊN",
      headerName: "Tên nhân viên",
      flex: 1,
      editable: false,
    },
    {
      field: "TÊN BỘ PHẬN",
      headerName: "Tên bộ phận",
      flex: 1,
      editable: false,
    },
    { field: "Ngày", headerName: "Ngày", flex: 1, editable: false },
    {
      field: "S1",
      headerName: "S1",
      flex: 1,
      editable: true,
    },
    {
      field: "S2",
      headerName: "S2",
      flex: 1,
      editable: true,
    },
    {
      field: "C1",
      headerName: "C1",
      flex: 1,
      editable: true,
    },
    {
      field: "C2",
      headerName: "C2",
      flex: 1,
      editable: true,
    },
  ];

  const departmentList = useMemo(
    () => ["Tất cả", ...new Set(rows.map((row) => row["TÊN BỘ PHẬN"]))],
    [rows]
  );

  return (
    <div style={{ height: 650, width: "100%" }}>
      <FormControl style={{ marginBottom: "20px", width: "200px" }}>
        <InputLabel id="department-filter-label">Lọc theo bộ phận</InputLabel>
        <Select
          labelId="department-filter-label"
          value={selectedDepartment}
          onChange={(event) => setSelectedDepartment(event.target.value)}
        >
          {departmentList.map((department, index) => (
            <MenuItem key={index} value={department}>
              {department}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DataGrid
        rows={filteredRows}
        columns={columns}
        processRowUpdate={handleProcessRowUpdate}
        disableColumnMenu
        experimentalFeatures={{ newEditingApi: true }}
        getRowId={(row) => row.id}
      />
    </div>
  );
});

export default AttendanceTable;
