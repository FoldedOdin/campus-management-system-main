// src/components/Navbar.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Logout, Person } from '@mui/icons-material';
import logo from '../logo.svg';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' }}>
      <Toolbar>
        <Box
          component="img"
          src={logo}
          alt="Campus Council logo"
          sx={{ width: 32, height: 32, mr: 2 }}
        />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Campus Council
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" onClick={() => navigate('/profile')}>
            <Person sx={{ mr: 1 }} />
            Profile
          </Button>
          <Button color="inherit" onClick={logout}>
            <Logout sx={{ mr: 1 }} />
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
