import React from 'react';
import { Container, Typography, IconButton } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';
import Home from './pages/Home';

function App() {
  // Dùng ref để điều khiển hành vi của SnackbarProvider
  const notistackRef = React.createRef();

  // Hàm để đóng thông báo
  const onClickDismiss = (key) => () => {
    notistackRef.current.closeSnackbar(key);
  };

  return (
    <SnackbarProvider 
      ref={notistackRef} 
      maxSnack={3} 
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
      autoHideDuration={3000}
      preventDuplicate={true} // Ngăn không hiển thị thông báo trùng lặp
      action={(key) => (
        <IconButton onClick={onClickDismiss(key)} style={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      )}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" sx={{ mt: 4, mb: 2 }}>
          Ứng dụng chấm công
        </Typography>
        <Home />
      </Container>
    </SnackbarProvider>
  );
}

export default App;
