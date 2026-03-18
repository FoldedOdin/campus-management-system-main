// src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DarkVeil from './components/DarkVeil';
import Iridescence from './components/Iridescence';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import StudentSectionRouter from './pages/StudentSectionRouter';
import Results from './pages/Results';
import Profile from './pages/profile';
import EventManagementDashboard from './pages/EventManagementDashboard';
import ChairmanDashboard from './pages/ChairmanDashboard';
import ArtsSecretaryDashboard from './pages/ArtsSecretaryDashboard';
import SportsSecretaryDashboard from './pages/SportsSecretaryDashboard';
import MagazineEditorDashboard from './pages/MagazineEditorDashboard';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { keyframes } from '@mui/system';

const BACKGROUND_STORAGE_KEY = 'tv_background_settings';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#38bdf8',
    },
    secondary: {
      main: '#22d3ee',
    },
    background: {
      default: '#050b12',
      paper: 'rgba(8, 18, 28, 0.82)',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8'
    }
  },
  typography: {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #5f7fb7 0%, #6e6ad1 45%, #4aa3c8 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          backgroundImage: 'linear-gradient(140deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.78))'
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          backgroundImage: 'linear-gradient(150deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.78))'
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          transition: 'transform 160ms ease, box-shadow 160ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 12px 26px rgba(8, 145, 178, 0.25)',
        },
      },
    },
  },
});

function App() {
  const [backgroundSettings, setBackgroundSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY);
      return raw
        ? JSON.parse(raw)
        : {
            mode: 'iridescence',
            iridescenceColor: [0.5, 0.6, 0.8],
            iridescenceSpeed: 1.1,
            iridescenceAmplitude: 0.1,
            darkVeilOpacity: 0.2
          };
    } catch (err) {
      return {
        mode: 'iridescence',
        iridescenceColor: [0.5, 0.6, 0.8],
        iridescenceSpeed: 1.1,
        iridescenceAmplitude: 0.1,
        darkVeilOpacity: 0.2
      };
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY);
        if (raw) setBackgroundSettings(JSON.parse(raw));
      } catch (err) {
        // ignore parsing errors
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('tv-background-settings', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tv-background-settings', handleStorage);
    };
  }, []);

  const backgroundFlags = useMemo(() => {
    const mode = backgroundSettings?.mode || 'both';
    return {
      showIridescence: mode === 'both' || mode === 'iridescence',
      showDarkVeil: mode === 'both' || mode === 'darkveil'
    };
  }, [backgroundSettings]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none'
            }}
          >
            {backgroundFlags.showIridescence && (
              <Iridescence
                color={backgroundSettings?.iridescenceColor || [0.4, 0.8, 1]}
                mouseReact
                amplitude={backgroundSettings?.iridescenceAmplitude ?? 0.12}
                speed={backgroundSettings?.iridescenceSpeed ?? 1.25}
                style={{ position: 'absolute', inset: 0 }}
              />
            )}
            {backgroundFlags.showDarkVeil && (
              <div style={{ position: 'absolute', inset: 0, opacity: backgroundSettings?.darkVeilOpacity ?? 0.55 }}>
                <DarkVeil
                  hueShift={210}
                  noiseIntensity={0.02}
                  scanlineIntensity={0.04}
                  speed={0.55}
                  scanlineFrequency={1.2}
                  warpAmount={0.08}
                />
              </div>
            )}
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Routes */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/*"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentSectionRouter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events/management"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'chairman', 'staff_coordinator']}>
                      <EventManagementDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chairman"
                  element={
                    <ProtectedRoute allowedRoles={['chairman']}>
                      <ChairmanDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
