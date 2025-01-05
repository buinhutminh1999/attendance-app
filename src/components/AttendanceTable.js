
import React, { memo, useCallback, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { MenuItem, Select, FormControl, InputLabel, Tooltip } from "@mui/material";
import { validateNewValue } from "../utils/attendanceUtils";
import { useSnackbar } from "notistack";

const AttendanceTable = memo(({ rows, onCellUpdate }) => {
  const [selectedDepartment, setSelectedDepartment] = useState("Tất cả");
  const { enqueueSnackbar } = useSnackbar();

  const handleProcessRowUpdate = useCallback(
    (newRow, oldRow) => {
      const updatedRow = { ...newRow };
      const fieldName = Object.keys(newRow).find(
        (key) => newRow[key] !== oldRow[key]
      );

      if (fieldName) {
        const isValid = validateNewValue(fieldName, newRow[fieldName], enqueueSnackbar);
        if (!isValid) return oldRow;

        onCellUpdate(newRow.id, fieldName, newRow[fieldName]);
      }

      return updatedRow;
    },
    [onCellUpdate, enqueueSnackbar]
  );

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) =>
        selectedDepartment === "Tất cả"
          ? true
          : row["TÊN BỘ PHẬN"] === selectedDepartment
      )
      .map((row, index) => ({
        ...row,
        id: index + 1,
      }));
  }, [rows, selectedDepartment]);

  const departmentList = useMemo(() => ["Tất cả", ...new Set(rows.map((row) => row["TÊN BỘ PHẬN"]))], [rows]);

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

      <Tooltip title="Bảng chấm công" arrow>
        <DataGrid
          rows={filteredRows}
          columns={[
            { field: "id", headerName: "STT", width: 70 },
            { field: "TÊN NHÂN VIÊN", headerName: "Tên nhân viên", flex: 1 },
            { field: "TÊN BỘ PHẬN", headerName: "Tên bộ phận", flex: 1 },
            { field: "Ngày", headerName: "Ngày", flex: 1 },
            { field: "S1", headerName: "S1", flex: 1, editable: true },
            { field: "S2", headerName: "S2", flex: 1, editable: true },
            { field: "C1", headerName: "C1", flex: 1, editable: true },
            { field: "C2", headerName: "C2", flex: 1, editable: true },
          ]}
          processRowUpdate={handleProcessRowUpdate}
          disableColumnMenu
          experimentalFeatures={{ newEditingApi: true }}
          getRowId={(row) => row.id}
          sx={{
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
        />
      </Tooltip>
    </div>
  );
});

export default AttendanceTable;
