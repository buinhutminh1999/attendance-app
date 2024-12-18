import * as XLSX from 'xlsx';

export const useFileUpload = (onFileUpload) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryString = e.target.result;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet);
        onFileUpload(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  return { handleFileUpload };
};
