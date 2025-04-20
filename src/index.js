// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';       // React 18+
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// 1. Tạo theme (bạn có thể customize ở đây nếu cần)
const theme = createTheme({
  // palette, typography, v.v.
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline injects the global CSS resets + MUI default styles */}
    <CssBaseline />
    <App />
  </ThemeProvider>
);
