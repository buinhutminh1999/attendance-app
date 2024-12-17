import React from "react";
import { Button } from "@mui/material";

const PrintButtons = ({
  printAllDepartments,
  groupedData,
  printDepartment,
}) => (
  <>
    <Button
      variant="contained"
      className="button-group"
      onClick={printAllDepartments}
    >
      In tất cả bộ phận
    </Button>
    {Object.keys(groupedData).map((department) => (
      <Button
        className="button-group"
        variant="contained"
        onClick={() => printDepartment(department)}
        key={department}
        style={{ marginLeft: 10 }} // Adds space between the buttons
      >
        In bộ phận: {department}
      </Button>
    ))}
  </>
);

export default PrintButtons;
