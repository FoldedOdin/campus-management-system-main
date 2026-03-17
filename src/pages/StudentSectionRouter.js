import React from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Home, HowToVote, SportsSoccer, Celebration } from '@mui/icons-material';
import StudentDashboard from './StudentDashboard';
import StudentSportsPage from './StudentSportsPage';
import StudentOtherEventsPage from './StudentOtherEventsPage';
import StudentHomePage from './StudentHomePage';
import StudentEventsPage from './StudentEventsPage';

const navItems = [
  { label: 'Home', path: '/student/home', icon: <Home /> },
  { label: 'Vote', path: '/student/vote', icon: <HowToVote /> },
  { label: 'Sports', path: '/student/sports', icon: <SportsSoccer /> },
  { label: 'Events', path: '/student/events', icon: <Celebration /> }
];

export default function StudentSectionRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideTopNavOnVote = location.pathname === '/student/vote';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {!hideTopNavOnVote && (
        <Paper
          elevation={2}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            p: { xs: 1.5, md: 2 },
            borderRadius: 0,
            backdropFilter: 'blur(8px)',
            background: 'linear-gradient(90deg, rgba(3,37,58,0.95) 0%, rgba(8,62,95,0.9) 55%, rgba(14,116,144,0.88) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.18)'
          }}
        >
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1, letterSpacing: 0.4 }}>
            Student Navigation
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                component={NavLink}
                to={item.path}
                startIcon={item.icon}
                variant={location.pathname === item.path ? 'contained' : 'outlined'}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.42)',
                  borderRadius: 2.5,
                  px: 1.5,
                  minWidth: { xs: 'calc(50% - 4px)', md: 132 },
                  justifyContent: 'center',
                  backdropFilter: 'blur(6px)',
                  '&:hover': {
                    borderColor: '#fff',
                    background: 'rgba(255,255,255,0.1)'
                  },
                  '&.active': {
                    background: 'linear-gradient(120deg, #0284c7 0%, #0e7490 100%)',
                    borderColor: 'transparent'
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Paper>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/student/home" replace />} />
        <Route path="home" element={<StudentHomePage />} />
        <Route path="vote" element={<StudentDashboard />} />
        <Route path="announcements" element={<StudentDashboard />} />
        <Route path="sports" element={<StudentSportsPage />} />
        <Route path="other-events" element={<StudentOtherEventsPage />} />
        <Route path="events/:category" element={<StudentEventsPage />} />
        <Route path="events" element={<StudentEventsPage />} />
        <Route path="*" element={<Navigate to="/student/home" replace />} />
      </Routes>

      <Button
        onClick={() => navigate('/student/home')}
        startIcon={<Home />}
        variant="contained"
        sx={{
          position: 'fixed',
          left: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          zIndex: 20,
          borderRadius: 999,
          px: 2.2,
          background: 'linear-gradient(120deg, #0284c7 0%, #0e7490 100%)',
          boxShadow: '0 14px 30px rgba(2, 34, 57, 0.28)',
          '&:hover': {
            background: 'linear-gradient(120deg, #0e7490 0%, #0284c7 100%)',
          }
        }}
      >
        Back Home
      </Button>
    </Box>
  );
}
