import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from "@mui/material";

const AttendanceTable = ({ filteredData, handleEdit }) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>STT</TableCell>
          <TableCell>Tên nhân viên</TableCell>
          <TableCell>Ngày</TableCell>
          <TableCell>Thứ</TableCell>
          <TableCell>S1</TableCell>
          <TableCell>S2</TableCell>
          <TableCell>C1</TableCell>
          <TableCell>C2</TableCell>
          <TableCell>Tên bộ phận</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredData.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell>{row["TÊN NHÂN VIÊN"] || "N/A"}</TableCell>
            <TableCell>{row["Ngày"] instanceof Date ? row["Ngày"].toLocaleDateString() : "N/A"}</TableCell>
            <TableCell>{row["Thứ"] || "N/A"}</TableCell>

            {['S1', 'S2', 'C1', 'C2'].map((key) => (
              <TableCell key={key}>
                <TextField 
                  value={row[key] || ""} 
                  onChange={(e) => handleEdit(idx, key, e.target.value)} 
                  fullWidth 
                  size="small" 
                />
              </TableCell>
            ))}

            <TableCell>{row["TÊN BỘ PHẬN"] || "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default AttendanceTable;
