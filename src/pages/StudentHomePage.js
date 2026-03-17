import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HowToVote, SportsSoccer, Announcement, Celebration, CheckCircle, Pending, Logout } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { candidatesService, collegeEventRequestsService, votesService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import './StudentHomePage.css';
import Iridescence from '../components/Iridescence';

const menuCards = [
  {
    title: 'Voting',
    description: 'Cast your vote and track election updates.',
    icon: <HowToVote sx={{ fontSize: 40 }} />,
    path: '/student/vote',
    color: '#0ea5e9'
  },
  {
    title: 'Sports',
    description: 'Join sports events by submitting your details.',
    icon: <SportsSoccer sx={{ fontSize: 40 }} />,
    path: '/student/sports',
    color: '#22c55e'
  },
  {
    title: 'Announcements',
    description: 'View the latest announcements and posters from admins and coordinators.',
    icon: <Announcement sx={{ fontSize: 40 }} />,
    path: '/student/announcements',
    color: '#38bdf8'
  },
  {
    title: 'All Events',
    description: 'Browse all campus events and category updates.',
    icon: <Celebration sx={{ fontSize: 40 }} />,
    path: '/student/events',
    color: '#8b5cf6'
  }
];


export default function StudentHomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [winnerRequestStatus, setWinnerRequestStatus] = useState(null);
  const [isWinner, setIsWinner] = useState(false);
  const [error, setError] = useState('');

  const loadWinnerRequestStatus = useCallback(async () => {
    if (!currentUser?.id) {
      setIsWinner(false);
      setWinnerRequestStatus(null);
      setLoading(false);
      return;
    }
    try {
      const [candidates, votes] = await Promise.all([
        candidatesService.getAllAdmin ? candidatesService.getAllAdmin() : candidatesService.getAll(),
        votesService.getAllWithBlockchainAudit()
      ]);
      const voteCounts = (votes || []).reduce((acc, vote) => {
        acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
        return acc;
      }, {});
      const topCandidate = (candidates || [])
        .map((candidate) => ({ ...candidate, votes: voteCounts[candidate.id] || 0 }))
        .sort((a, b) => b.votes - a.votes)[0];

      const winnerLoggedIn =
        !!topCandidate &&
        topCandidate.votes > 0 &&
        String(topCandidate.user_id) === String(currentUser.id);
      setIsWinner(winnerLoggedIn);

      if (winnerLoggedIn) {
        const requests = await collegeEventRequestsService.getByWinnerUser(currentUser.id);
        setWinnerRequestStatus((requests || [])[0]?.status || null);
      } else {
        setWinnerRequestStatus(null);
      }
    } catch (err) {
      console.error('Failed to load student home status', err);
      setError('Could not load latest event status.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadWinnerRequestStatus();
  }, [loadWinnerRequestStatus]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`student-home-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'college_event_requests' }, loadWinnerRequestStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadWinnerRequestStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadWinnerRequestStatus]);

  const statusMeta = useMemo(() => {
    if (!isWinner) return null;
    if (winnerRequestStatus === 'approved') {
      return { color: 'success', text: 'Admin approved your event handling request', icon: <CheckCircle fontSize="small" /> };
    }
    if (winnerRequestStatus === 'pending') {
      return { color: 'info', text: 'Your event handling request is pending admin approval', icon: <Pending fontSize="small" /> };
    }
    if (winnerRequestStatus === 'rejected') {
      return { color: 'error', text: 'Your event handling request was rejected by admin', icon: <Pending fontSize="small" /> };
    }
    return { color: 'warning', text: 'You are winner. Submit your event handling request.', icon: <Celebration fontSize="small" /> };
  }, [isWinner, winnerRequestStatus]);
  const canOpenManagement = [
    'admin',
    'chairman',
    'staff_coordinator',
    'event_coordinator',
    'arts_secretary',
    'sports_secretary',
    'magazine_editor'
  ].includes(currentUser?.role);
  const firstName = currentUser?.fullName?.split(' ')[0] || 'Student';
  const profileCards = [
    { label: 'Role', value: currentUser?.role ? currentUser.role.replace('_', ' ') : 'student' },
    { label: 'Department', value: currentUser?.department || 'Not set' },
    { label: 'Register No.', value: currentUser?.registrationNumber || 'Not set' },
    {
      label: 'Winner Status',
      value: !isWinner
        ? 'Not winner yet'
        : winnerRequestStatus === 'approved'
          ? 'Approved'
          : winnerRequestStatus === 'pending'
            ? 'Pending review'
            : winnerRequestStatus === 'rejected'
              ? 'Rejected'
              : 'Action needed'
    }
  ];
  return (
    <Box
      className="student-home-page"
      sx={{
        minHeight: '100vh',
        p: { xs: 2, md: 4 },
        background: 'transparent',
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
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Card
          className="student-home-hero"
          sx={{
            mb: 3,
          borderRadius: 4.5,
          color: 'white',
          background: 'linear-gradient(122deg, #04121f 0%, #0b3b5f 45%, #0ea5e9 100%)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <CardContent sx={{ py: 3.5, px: { xs: 2.5, md: 3.5 } }}>
          <Grid container spacing={2.5} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="overline" sx={{ letterSpacing: 1.4, opacity: 0.8 }}>
                CAMPUS COUNCIL STUDENT PORTAL
              </Typography>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Welcome back, {firstName}
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                Continue with voting, event participation, and campus activity updates.
              </Typography>
              {!!statusMeta && (
                <Chip
                  sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
                  icon={statusMeta.icon}
                  variant="outlined"
                  label={statusMeta.text}
                />
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.24)'
                }}
              >
                <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                  Profile Snapshot
                </Typography>
                <Stack spacing={0.8}>
                  <Typography variant="body2">Name: {currentUser?.fullName || 'Not set'}</Typography>
                  <Typography variant="body2">Email: {currentUser?.email || 'Not set'}</Typography>
                  <Typography variant="body2">Department: {currentUser?.department || 'Not set'}</Typography>
                </Stack>
                <Button
                  onClick={logout}
                  startIcon={<Logout />}
                  variant="outlined"
                  sx={{
                    mt: 2,
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.6)',
                    '&:hover': {
                      borderColor: '#fff',
                      background: 'rgba(255,255,255,0.12)'
                    }
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 10 }} />}
      {!!error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {profileCards.map((card, index) => (
          <Grid item xs={6} md={3} key={card.label}>
            <Card
              className="student-home-status-card"
              style={{ animationDelay: `${0.03 * index}s` }}
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.9)'
              }}
            >
              <CardContent sx={{ py: 1.8 }}>
                <Typography
                  variant="caption"
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    color: '#334155'
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mt: 0.5, color: '#0f172a' }}
                >
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" color="white" fontWeight={700} sx={{ mb: 1.6 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {menuCards.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%' }}>
                <CardContent sx={{ minHeight: 168 }}>
                  <Box sx={{ color: item.color, mb: 1.5 }}>{item.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {canOpenManagement && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Role-based event management is enabled for your account.
          </Alert>
          <Card sx={{ borderRadius: 3 }}>
            <CardActionArea onClick={() => navigate('/events/management')}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Open Event Management Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage approvals, participation, winners, announcements, and role-based controls.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      )}
      </Box>
    </Box>
  );
}
