// src/components/LoadingSpinner.js
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { HowToVote } from '@mui/icons-material';

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <HowToVote sx={{ fontSize: 80, mb: 3 }} />
      <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
      <Typography variant="h6">{message}</Typography>
    </Box>
  );
}