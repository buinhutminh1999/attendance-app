// src/App.js
import React from 'react';
import { Container, Typography, IconButton } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';

// --- MỚI: import adapter cho date pickers ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import Home from './pages/Home';

function App() {
  const notistackRef = React.createRef();
  const onClickDismiss = (key) => () => {
    notistackRef.current.closeSnackbar(key);
  };

  return (
    <SnackbarProvider 
      ref={notistackRef} 
      maxSnack={3} 
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
      autoHideDuration={3000}
      preventDuplicate
      action={(key) => (
        <IconButton onClick={onClickDismiss(key)} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      )}
    >
      {/* MỞ: Bọc toàn app trong LocalizationProvider */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="lg">
          <Typography 
            variant="h4" 
            align="center" 
            sx={{ mt: 4, mb: 2 }}
          >
            Ứng dụng chấm công
          </Typography>
          <Home />
        </Container>
      </LocalizationProvider>
    </SnackbarProvider>
  );
}

export default App;
