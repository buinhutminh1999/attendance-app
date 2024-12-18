import React from 'react';
import { Button } from '@mui/material';

const PrintButton = ({ printContent }) => {

  const handlePrint = () => {
    // Mở cửa sổ mới
    const printWindow = window.open('', '_blank');
    
    // Nội dung HTML của bảng chấm công
    printWindow.document.write(`
      <html>
      <head>
        <title>In bảng chấm công</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 14px;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table th, table td {
            border: 1px solid black;
            text-align: center;
            padding: 8px;
          }
          table th {
            background-color: #f2f2f2;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-box {
            text-align: center;
            width: 40%;
          }
          .signature-title {
            font-size: 16px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${printContent} <!-- Nội dung cần in -->
      </body>
      </html>
    `);

    // Đợi nội dung được tải xong, sau đó thực hiện in
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={handlePrint}
      sx={{ mb: 2 }}
    >
      In bảng chấm công
    </Button>
  );
};

export default PrintButton;
