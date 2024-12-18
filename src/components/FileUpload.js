import React from 'react';
import { Button } from '@mui/material';
import { useFileUpload } from '../hooks/useFileUpload';

const FileUpload = ({ onFileUpload }) => {
  const { handleFileUpload } = useFileUpload(onFileUpload);

  return (
    <Button
      variant="contained"
      component="label"
      sx={{ mb: 2 }}
    >
      Tải tệp lên
      <input
        type="file"
        accept=".xlsx, .xls"
        hidden
        onChange={handleFileUpload}
      />
    </Button>
  );
};

export default FileUpload;
