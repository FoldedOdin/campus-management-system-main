import React, { useEffect, useState } from "react";
import { 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  MenuItem, 
  Select, 
  Box, 
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Alert,
  Fade,
  IconButton,
  CircularProgress
} from "@mui/material";
import { keyframes } from "@mui/system";
import { 
  Email, 
  Lock, 
  Person, 
  School, 
  AdminPanelSettings,
  PersonAdd,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usersService } from "../lib/supabaseService";
import BlurText from "../components/BlurText";
import { getHomeRouteForRole } from "../lib/roleRoutes";
import logo from "../logo.svg";
import Iridescence from "../components/Iridescence";

const withTimeout = (promise, ms, message) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
};

const callWithTimeoutRetry = async (fn, ms, message) => {
  try {
    return await withTimeout(fn(), ms, message);
  } catch (err) {
    const isTimeout = (err?.message || '').toLowerCase().includes('timed out');
    if (isTimeout) {
      return await withTimeout(fn(), ms, message);
    }
    throw err;
  }
};

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0% { transform: translateY(0px) translateX(0px) scale(1); }
  50% { transform: translateY(-18px) translateX(10px) scale(1.04); }
  100% { transform: translateY(0px) translateX(0px) scale(1); }
`;

const glowPulse = keyframes`
  0% { box-shadow: 0 0 0 rgba(21, 101, 192, 0.15); }
  50% { box-shadow: 0 0 28px rgba(21, 101, 192, 0.35); }
  100% { box-shadow: 0 0 0 rgba(21, 101, 192, 0.15); }
`;

const cardReveal = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const logoReveal = keyframes`
  from { opacity: 0; filter: blur(12px); transform: translateY(-14px) scale(0.95); }
  to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [infoMessage, setInfoMessage] = useState(location.state?.message || "");
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const AUTH_TIMEOUT_MS = 20000;
  const loggedOutKey = "trustvote_logged_out";

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        try {
          if (sessionStorage.getItem(loggedOutKey)) {
            sessionStorage.removeItem(loggedOutKey);
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch (err) {
              // ignore
            }
            return;
          }
        } catch (err) {
          // ignore storage errors
        }

        if (!supabaseUrl || !supabaseAnonKey) {
          setError("Supabase is not configured. Please check your .env file.");
          return;
        }

        const { data, error: sessionError } = await callWithTimeoutRetry(
          () => supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          "Session check timed out"
        );
        if (sessionError) {
          return;
        }
        const user = data?.session?.user;
        if (!user) {
          return;
        }

        let profile = await callWithTimeoutRetry(
          () => usersService.getById(user.id),
          AUTH_TIMEOUT_MS,
          "Profile lookup timed out"
        );
        if (!profile) {
          try {
            const meta = user.user_metadata || {};
            const profilePayload = {
              id: user.id,
              email: user.email,
              full_name: meta.full_name || '',
              role: meta.role || 'student',
              student_id: meta.student_id || null,
              department: meta.department || null,
              year: meta.year || null,
              phone: meta.phone || null,
              verified: true
            };
            await callWithTimeoutRetry(
              () => usersService.upsert(profilePayload),
              AUTH_TIMEOUT_MS,
              "Profile save timed out"
            );
            profile = await callWithTimeoutRetry(
              () => usersService.getById(user.id),
              AUTH_TIMEOUT_MS,
              "Profile lookup timed out"
            );
          } catch (profileErr) {
            // Keep login usable even if public.users has temporary DB/RLS issues
          }
        }

        const effectiveRole = user?.user_metadata?.role || profile?.role || 'student';
        const roleToRoute = getHomeRouteForRole(effectiveRole);
        navigate(roleToRoute, { replace: true });
      } catch (err) {
        const message = (err?.message || '').toLowerCase().includes('timed out')
          ? 'Session check timed out. Please try signing in manually.'
          : '';
        if (message) setError(message);
        // fall through to manual login
      }
    };
    checkExistingSession();
  }, [navigate, setError, supabaseUrl, supabaseAnonKey, AUTH_TIMEOUT_MS]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");
    
    try {
      const result = await login(email, password, role);
      if (!result?.ok) {
        if (result?.error) setError(result.error);
        return;
      }
      const route = getHomeRouteForRole(result.role);
      navigate(route, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  // Demo login removed for production

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0b1020',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0
        }}
      >
        <Iridescence
          color={[0.5, 0.6, 0.8]}
          mouseReact
          amplitude={0.1}
          speed={1}
        />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.18), transparent 35%), radial-gradient(circle at 85% 12%, rgba(14, 165, 233, 0.18), transparent 32%), linear-gradient(120deg, rgba(2, 6, 23, 0.92), rgba(2, 6, 23, 0.65))'
        }}
      />
      <Card 
        elevation={10}
        sx={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 5,
          overflow: 'hidden',
          background: 'rgba(2, 6, 23, 0.82)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          animation: `${cardReveal} 500ms ease-out, ${glowPulse} 5s ease-in-out infinite`,
          boxShadow: '0 25px 60px rgba(2, 8, 23, 0.55)',
          position: 'relative',
          zIndex: 2
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(120deg, #020617 0%, #0f172a 45%, #0ea5e9 100%)',
            color: 'white',
            textAlign: 'center',
            py: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.2,
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 75%, transparent 75%, transparent)',
              backgroundSize: '36px 36px',
              animation: `${gradientShift} 18s linear infinite`
            }}
          />
          <Box
            component="img"
            src={logo}
            alt="Campus Council logo"
            sx={{
              width: 64,
              height: 64,
              mb: 2,
              position: 'relative',
              zIndex: 1,
              opacity: 0,
              animation: `${logoReveal} 700ms ease-out 80ms forwards, ${float} 4s ease-in-out 800ms infinite`
            }}
          />
          <BlurText
            text="Campus Council"
            delay={90}
            animateBy="chars"
            direction="top"
            className="campus-council-login-title"
            stepDuration={0.4}
            easing="cubic-bezier(0.22, 1, 0.36, 1)"
          />
          <Typography variant="h6" sx={{ opacity: 0.9, position: 'relative', zIndex: 1 }}>
            Campus Council Election Portal
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.75, position: 'relative', zIndex: 1, mt: 1 }}
          >
            Secure, verified access for every campus role.
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Fade in={!!error}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}
          {infoMessage && (
            <Fade in={!!infoMessage}>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2
                }}
              >
                {infoMessage}
              </Alert>
            </Fade>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Login As</InputLabel>
            <Select
              value={role}
              label="Login As"
              onChange={(e) => setRole(e.target.value)}
              startAdornment={
                <InputAdornment position="start" sx={{ mr: 1 }}>
                  <Person sx={{ color: 'primary.main' }} />
                </InputAdornment>
              }
              sx={{
                borderRadius: 3,
                transition: 'transform 180ms ease',
                '&:hover': { transform: 'translateY(-1px)' }
              }}
            >
              <MenuItem value="student">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <School sx={{ mr: 1, color: 'primary.main' }} />
                  Student
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminPanelSettings sx={{ mr: 1, color: 'secondary.main' }} />
                  Administrator
                </Box>
              </MenuItem>
              <MenuItem value="chairman">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminPanelSettings sx={{ mr: 1, color: 'secondary.main' }} />
                  Chairman
                </Box>
              </MenuItem>
              <MenuItem value="staff_coordinator">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminPanelSettings sx={{ mr: 1, color: 'secondary.main' }} />
                  Staff Coordinator
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                transition: 'all 180ms ease',
                '&:hover': {
                  boxShadow: '0 0 0 3px rgba(14,116,144,0.12)'
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 4px rgba(2,132,199,0.16)'
                }
              }
            }}
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                transition: 'all 180ms ease',
                '&:hover': {
                  boxShadow: '0 0 0 3px rgba(14,116,144,0.12)'
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 4px rgba(2,132,199,0.16)'
                }
              }
            }}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={!email || !password || loading}
            sx={{
              py: 1.5,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'linear-gradient(100deg, #0369a1 0%, #0e7490 45%, #155e75 100%)',
              boxShadow: '0 14px 25px rgba(12, 74, 110, 0.32)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-120%',
                width: '70%',
                height: '100%',
                transform: 'skewX(-24deg)',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                transition: 'left 420ms ease'
              },
              '&:hover': {
                background: 'linear-gradient(100deg, #0e7490 0%, #0369a1 45%, #164e63 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 18px 30px rgba(12, 74, 110, 0.38)',
                '&::before': {
                  left: '130%'
                }
              }
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Demo login removed; keep direct signup link below */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Don't have an account?
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSignupRedirect}
              startIcon={<PersonAdd />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 'bold',
                borderWidth: 2,
                transition: 'all 180ms ease',
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  backgroundColor: 'rgba(2,132,199,0.08)'
                }
              }}
            >
              Create New Account Now!
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

