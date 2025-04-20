// src/components/PrintButton.js
import React from "react";
import { Button } from "@mui/material";

const PrintButton = ({ onPrint }) => {
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={onPrint}
      sx={{ mb: 2 }}
    >
      In bảng chấm công
    </Button>
  );
};

export default PrintButton;
