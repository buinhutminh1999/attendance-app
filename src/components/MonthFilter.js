import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

export default function MonthFilter({ months, value, onChange }) {
  return (
    <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
      <InputLabel>Tháng</InputLabel>
      <Select
        label="Tháng"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="all">Tất cả</MenuItem>
        {months.map((m) => (
          <MenuItem key={m} value={m}>{m}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
