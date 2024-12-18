import React, { memo, useCallback, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { MenuItem, Select, FormControl, InputLabel } from '@mui/material';

const AttendanceTable = memo(({ rows, onCellUpdate }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('Tất cả');

  // Lọc dữ liệu theo bộ phận
  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
  };

  // Lọc dữ liệu theo bộ phận
  const filteredRows = selectedDepartment === 'Tất cả'
    ? rows
    : rows.filter(row => row['TÊN BỘ PHẬN'] === selectedDepartment);

  // Xử lý cập nhật dữ liệu khi người dùng chỉnh sửa các ô
  const handleProcessRowUpdate = useCallback((newRow, oldRow) => {
    const updatedRow = { ...newRow };
    const fieldName = Object.keys(newRow).find(key => newRow[key] !== oldRow[key]);
    if (fieldName) {
      onCellUpdate(newRow.id, fieldName, newRow[fieldName]);
    }
    return updatedRow;
  }, [onCellUpdate]);

  // Hàm kiểm tra đi trễ cho S1 (trễ sau 07:15) và C1 (trễ sau 13:00)
  const isLate = (time, threshold) => {
    if (!time || time === 'Chưa ghi nhận') return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // Regex kiểm tra định dạng hh:mm
    if (!timeRegex.test(time)) return false; // Kiểm tra định dạng thời gian hợp lệ
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes > threshold;
  };

  const columns = [
    { field: 'id', headerName: 'STT', width: 70 },
    { field: 'TÊN NHÂN VIÊN', headerName: 'Tên nhân viên', flex: 1, editable: false },
    { field: 'TÊN BỘ PHẬN', headerName: 'Tên bộ phận', flex: 1, editable: false },
    { field: 'Ngày', headerName: 'Ngày', flex: 1, editable: false },
    { 
      field: 'S1', 
      headerName: 'S1', 
      flex: 1, 
      editable: true,
      cellClassName: (params) => {
        if (!params.value || params.value === 'Chưa ghi nhận') return '';
        return isLate(params.value, 7 * 60 + 15) ? 'late-cell' : '';
      }
    },
    { 
      field: 'S2', 
      headerName: 'S2', 
      flex: 1, 
      editable: true 
    },
    { 
      field: 'C1', 
      headerName: 'C1', 
      flex: 1, 
      editable: true,
      cellClassName: (params) => {
        if (!params.value || params.value === 'Chưa ghi nhận') return '';
        return isLate(params.value, 13 * 60) ? 'late-cell' : '';
      }
    },
    { 
      field: 'C2', 
      headerName: 'C2', 
      flex: 1, 
      editable: true 
    }
  ];

  // Danh sách các bộ phận duy nhất có trong dữ liệu
  const departmentList = ['Tất cả', ...new Set(rows.map(row => row['TÊN BỘ PHẬN']))];

  return (
    <div style={{ height: 650, width: '100%' }}>
      <FormControl style={{ marginBottom: '20px', width: '200px' }}>
        <InputLabel id="department-filter-label">Lọc theo bộ phận</InputLabel>
        <Select
          labelId="department-filter-label"
          value={selectedDepartment}
          onChange={handleDepartmentChange}
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
        sx={{
          '& .MuiDataGrid-cell--editable': {
            backgroundColor: '#F0F8FF'
          },
          '& .late-cell': {
            backgroundColor: '#FFCCCB !important' // Màu đỏ nhạt cho ô đi trễ
          }
        }}
      />
    </div>
  );
});

export default AttendanceTable;
