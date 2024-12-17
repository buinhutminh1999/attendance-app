import React from "react";
import { TextField } from "@mui/material";

const SearchField = ({ searchTerm, setSearchTerm }) => (
  <TextField 
    label="Tìm kiếm" 
    variant="outlined" 
    fullWidth 
    value={searchTerm} 
    onChange={(e) => setSearchTerm(e.target.value)} 
  />
);

export default SearchField;