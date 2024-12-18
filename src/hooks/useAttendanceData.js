import { useState, useCallback, useRef } from 'react';

const useAttendanceData = () => {
  const [filteredData, setFilteredData] = useState([]);
  const attendanceDataRef = useRef([]);

  const setInitialData = useCallback((data) => {
    attendanceDataRef.current = data;
    setFilteredData(data);
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

  const handleSearchChange = useCallback((searchTerm) => {
    if (!searchTerm) {
      setFilteredData(attendanceDataRef.current);
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = attendanceDataRef.current.filter(row => 
        Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(lowerCaseSearchTerm)
        )
      );
      setFilteredData(filtered);
    }
  }, []);

  return { filteredData, setInitialData, handleUpdateCell, handleSearchChange };
};

export default useAttendanceData;
