import React from 'react';
import { Container, Typography, IconButton } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';
import Home from './pages/Home';

function App() {
  const notistackRef = React.createRef();
  const onClickDismiss = (key) => () => notistackRef.current.closeSnackbar(key);

  return (
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
      <Container maxWidth="lg">
        <Typography variant="h3" align="center" sx={{ my: 4, fontWeight: 'bold' }}>
          Ứng dụng chấm công
        </Typography>
        <Home />
      </Container>
    </SnackbarProvider>
  );
}

export default App;
