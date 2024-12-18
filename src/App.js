import React from 'react';
import { Container, Typography } from '@mui/material';
import Home from './pages/Home';

function App() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" align="center" sx={{ mt: 4, mb: 2 }}>
        Ứng dụng chấm công
      </Typography>
      <Home />
    </Container>
  );
}

export default App;
