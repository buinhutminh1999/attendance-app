import React, { useState, useCallback, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import AttendanceTable from '../components/AttendanceTable';
import FilterToolbar from '../components/FilterToolbar';
import PrintButton from '../components/PrintButton';
import { format } from 'date-fns';

const convertExcelDateToJSDate = (excelDate) => {
  if (!excelDate) return 'Chưa ghi nhận'; 
  if (typeof excelDate === 'number') {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000); 
    return format(jsDate, 'dd/MM/yyyy'); 
  }
  return format(new Date(excelDate), 'dd/MM/yyyy'); 
};

const convertExcelTimeToTimeString = (decimalTime) => {
  if (!decimalTime) return 'Chưa ghi nhận'; 
  const hours = Math.floor(decimalTime * 24); 
  const minutes = Math.round((decimalTime * 1440) % 60); 
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const Home = () => {
  const [filteredData, setFilteredData] = useState([]);
  const attendanceDataRef = useRef([]); 

  const handleFileUpload = useCallback((data) => {
    const formattedData = data.map((row, index) => ({
      id: index + 1,
      ...row,
      Ngày: convertExcelDateToJSDate(row['Ngày']),
      S1: convertExcelTimeToTimeString(row['S1']),
      S2: convertExcelTimeToTimeString(row['S2']),
      C1: convertExcelTimeToTimeString(row['C1']),
      C2: convertExcelTimeToTimeString(row['C2'])
    }));
    attendanceDataRef.current = formattedData;
    setFilteredData(formattedData.map((row, index) => ({ ...row, id: index + 1 })));
  }, []);

  const handleUpdateCell = useCallback((rowId, columnName, newValue) => {
    attendanceDataRef.current = attendanceDataRef.current.map(row => 
      row.id === rowId ? { ...row, [columnName]: newValue } : row
    );
    setFilteredData(prevData => 
      prevData.map(row => 
        row.id === rowId ? { ...row, [columnName]: newValue } : row
      )
    );
  }, []);

  const handleSearchChange = (searchTerm) => {
    if (!searchTerm) {
      setFilteredData(attendanceDataRef.current.map((row, index) => ({ ...row, id: index + 1 })));
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = attendanceDataRef.current.filter(row => 
        Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(lowerCaseSearchTerm)
        )
      );
      setFilteredData(filtered.map((row, index) => ({ ...row, id: index + 1 })));
    }
  };

  const getPrintContent = () => {
    const departments = Array.from(new Set(filteredData.map(row => row['TÊN BỘ PHẬN']))); 
    return departments.map((department, index) => {
      const departmentData = filteredData.filter(row => row['TÊN BỘ PHẬN'] === department);
      const startDate = departmentData[0]?.['Ngày'] || '';
      const endDate = departmentData[departmentData.length - 1]?.['Ngày'] || '';

      return `
        ${index > 0 ? `<div style="page-break-before: always;"></div>` : ''}
        <h1 style="text-align: center; font-size: 24px; font-weight: bold;">
          Bảng công từ ngày ${startDate} đến ngày ${endDate} - Bộ phận: ${department}
        </h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên nhân viên</th>
              <th>Ngày</th>
              <th>Thứ</th>
              <th>S1</th>
              <th>S2</th>
              <th>Lý do đi trễ</th>
              <th>C1</th>
              <th>C2</th>
              <th>Lý do đi trễ</th>
            </tr>
          </thead>
          <tbody>
            ${departmentData.map(row => `
              <tr>
                <td>${row.id}</td>
                <td>${row['TÊN NHÂN VIÊN'] || 'Chưa ghi nhận'}</td>
                <td>${row['Ngày'] || 'Chưa ghi nhận'}</td>
                <td>${row['Thứ'] || 'Chưa ghi nhận'}</td>
                <td style="background-color: ${isLate(row['S1'], 7 * 60 + 15) ? '#FFCCCB' : 'transparent'};">
                  ${row['S1'] || 'Chưa ghi nhận'}
                </td>
                <td>${row['S2'] || 'Chưa ghi nhận'}</td>
                <td></td> 
                <td style="background-color: ${isLate(row['C1'], 13 * 60) ? '#FFCCCB' : 'transparent'};">
                  ${row['C1'] || 'Chưa ghi nhận'}
                </td>
                <td>${row['C2'] || 'Chưa ghi nhận'}</td>
                <td></td> 
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 50px;">
          <div style="text-align: center; width: 40%;">
            <p style="font-size: 16px; font-weight: bold;">Xác nhận của lãnh đạo bộ phận</p>
          </div>
          <div style="text-align: center; width: 40%;">
            <p style="font-size: 16px; font-weight: bold;">Người lập</p>
          </div>
        </div>
      `;
    }).join('');
  };

  const isLate = (time, threshold) => {
    if (!time || time === 'Chưa ghi nhận') return false;
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes > threshold;
  };

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
