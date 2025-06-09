// src/App.js

import React from 'react';
// BẮT ĐẦU THÊM VÀO
import { ThemeProvider, CssBaseline } from '@mui/material'; 
import { theme } from './theme'; // Import theme của bạn
// KẾT THÚC THÊM VÀO
import { Container, Typography, IconButton } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';
import Home from './pages/Home';

function App() {
  const notistackRef = React.createRef();
  const onClickDismiss = (key) => () => notistackRef.current.closeSnackbar(key);

  return (
    // Bọc toàn bộ ứng dụng trong ThemeProvider
    <ThemeProvider theme={theme}>
      {/* CssBaseline giúp chuẩn hóa CSS và áp dụng màu nền từ theme */}
      <CssBaseline /> 
      <SnackbarProvider
        ref={notistackRef}
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={3000}
        preventDuplicate
        action={(key) => (
          <IconButton size="small" onClick={onClickDismiss(key)} sx={{ color: '#fff' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      >
        {/* Bạn có thể giữ Container ở đây hoặc chuyển vào Home.js */}
        {/* Dưới đây là cách giữ nó lại */}
          {/* Tiêu đề này giờ sẽ lấy font và style từ theme */}
          
          <Home />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;