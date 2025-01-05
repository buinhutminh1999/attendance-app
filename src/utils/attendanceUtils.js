
export const updateCellValue = (data, rowId, columnName, newValue) => {
  return data.map((row) =>
    row.id === rowId ? { ...row, [columnName]: newValue } : row
  );
};

export const searchAttendanceData = (data, searchTerm) => {
  if (!searchTerm) return data;
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  return data.filter((row) =>
    Object.values(row).some((value) =>
      value && value.toString().toLowerCase().includes(lowerCaseSearchTerm)
    )
  );
};

export const validateNewValue = (fieldName, newValue, enqueueSnackbar) => {
  if (!newValue) {
    enqueueSnackbar("Giá trị không được để trống.", { variant: "error" });
    return false;
  }
  if (["S1", "S2", "C1", "C2"].includes(fieldName)) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newValue)) {
      enqueueSnackbar(
        `Giờ nhập cho cột ${fieldName} không hợp lệ. Vui lòng nhập lại theo định dạng hh:mm.`,
        { variant: "error" }
      );
      return false;
    }
  }
  return true;
};
