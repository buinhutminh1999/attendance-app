// src/theme.js
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Màu xanh dương bạn đang dùng
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f4f6f8', // Một màu nền hơi xám nhẹ
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
     h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Bo góc đồng bộ
  },
  components: {
    MuiPaper: {
        styleOverrides: {
            root: {
                boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
            }
        }
    }
  }
});