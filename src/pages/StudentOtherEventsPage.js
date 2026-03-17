import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import { Celebration, CheckCircle, Pending, Cancel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { candidatesService, collegeEventRequestsService, votesService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import Iridescence from '../components/Iridescence';

export default function StudentOtherEventsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    event_title: '',
    event_description: '',
    proposed_date: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [candidates, votes] = await Promise.all([
          candidatesService.getAllAdmin ? candidatesService.getAllAdmin() : candidatesService.getAll(),
          votesService.getAllWithBlockchainAudit()
        ]);

        const voteCounts = (votes || []).reduce((acc, vote) => {
          acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
          return acc;
        }, {});

        const sorted = (candidates || [])
          .map((candidate) => ({ ...candidate, votes: voteCounts[candidate.id] || 0 }))
          .sort((a, b) => b.votes - a.votes);

        const top = sorted[0] && sorted[0].votes > 0 ? sorted[0] : null;
        setWinner(top);

        if (currentUser?.id) {
          const requests = await collegeEventRequestsService.getByWinnerUser(currentUser.id);
          setExistingRequest((requests || [])[0] || null);
        }
      } catch (err) {
        console.error('Failed to load other events page', err);
        setError('Failed to load winner/event data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const refresh = async () => {
      try {
        const requests = await collegeEventRequestsService.getByWinnerUser(currentUser.id);
        setExistingRequest((requests || [])[0] || null);
      } catch (err) {
        console.error('Failed to refresh college event request status', err);
      }
    };
    const channel = supabase
      .channel(`student-other-events-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'college_event_requests' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const isWinnerLoggedIn = useMemo(() => {
    if (!winner || !currentUser?.id) return false;
    return String(winner.user_id) === String(currentUser.id);
  }, [winner, currentUser?.id]);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!isWinnerLoggedIn || !winner) {
      setError('Only the winning candidate can submit this request.');
      return;
    }
    if (!form.event_title.trim()) {
      setError('Please enter an event title.');
      return;
    }

    try {
      const pending = await collegeEventRequestsService.getPendingByWinnerUser(currentUser.id);
      if ((pending || []).length > 0) {
        setExistingRequest(pending[0]);
        setMessage('You already have a pending request. Wait for admin approval.');
        return;
      }

      const created = await collegeEventRequestsService.create({
        winner_candidate_id: winner.id,
        winner_user_id: currentUser.id,
        event_title: form.event_title.trim(),
        event_description: form.event_description.trim() || null,
        proposed_date: form.proposed_date || null,
        status: 'pending'
      });

      setExistingRequest(created);
      setForm({ event_title: '', event_description: '', proposed_date: '' });
      setMessage('Request submitted. Admin can now approve your winner event access.');
    } catch (err) {
      console.error('Failed to submit request', err);
      setError('Could not submit request.');
    }
  };

  const getStatusAlert = () => {
    if (!existingRequest?.status) return null;
    if (existingRequest.status === 'approved') {
      return <Alert severity="success" icon={<CheckCircle />}>Admin approved your winner request.</Alert>;
    }
    if (existingRequest.status === 'rejected') {
      return <Alert severity="error" icon={<Cancel />}>Admin rejected your request.</Alert>;
    }
    return <Alert severity="info" icon={<Pending />}>Your request is pending admin approval.</Alert>;
  };

  const getStatusChip = () => {
    if (!existingRequest?.status) return null;
    if (existingRequest.status === 'approved') return <Chip color="success" label="Approved By Admin" />;
    if (existingRequest.status === 'rejected') return <Chip color="error" label="Rejected By Admin" />;
    return <Chip color="info" label="Pending Approval" />;
  };

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, background: 'transparent', position: 'relative', overflow: 'hidden' }}>
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
        <Card sx={{ borderRadius: 4, mb: 3, background: 'linear-gradient(120deg, #581c87 0%, #7e22ce 45%, #a855f7 100%)', color: '#fff' }}>
        <CardContent>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <Celebration sx={{ mr: 1, verticalAlign: 'middle' }} />
            Other Events
          </Typography>
          <Typography sx={{ opacity: 0.92 }}>
            If admin changes winner event access, this page updates automatically.
          </Typography>
          <Box sx={{ mt: 2 }}>{getStatusChip()}</Box>
        </CardContent>
      </Card>

      {loading ? (
        <>
          <LinearProgress sx={{ borderRadius: 10, mb: 2 }} />
          <Alert severity="info">Loading event access details...</Alert>
        </>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Winner Details
                </Typography>
                <Typography><strong>Name:</strong> {winner?.name || 'No winner yet'}</Typography>
                <Typography><strong>Party:</strong> {winner?.party || '-'}</Typography>
                <Typography><strong>Votes:</strong> {winner?.votes || 0}</Typography>
                <Box sx={{ mt: 2 }}>{getStatusAlert()}</Box>
                {!!existingRequest?.updated_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Last updated: {new Date(existingRequest.updated_at).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Request Event Access
                </Typography>
                {!isWinnerLoggedIn && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    You are not the winning candidate, so you cannot submit this request.
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Event Title"
                  value={form.event_title}
                  onChange={(e) => setForm((prev) => ({ ...prev, event_title: e.target.value }))}
                  sx={{ mb: 2 }}
                  disabled={!isWinnerLoggedIn}
                />
                <TextField
                  fullWidth
                  label="Event Description"
                  multiline
                  rows={3}
                  value={form.event_description}
                  onChange={(e) => setForm((prev) => ({ ...prev, event_description: e.target.value }))}
                  sx={{ mb: 2 }}
                  disabled={!isWinnerLoggedIn}
                />
                <TextField
                  fullWidth
                  label="Proposed Date"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.proposed_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, proposed_date: e.target.value }))}
                  sx={{ mb: 2 }}
                  disabled={!isWinnerLoggedIn}
                />
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isWinnerLoggedIn || existingRequest?.status === 'pending'}
                >
                  Submit for Admin Approval
                </Button>
                {!!message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
                {!!error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="outlined" sx={{ color: 'white', borderColor: 'white' }} onClick={() => navigate('/student/home')}>
          Back to Home
        </Button>
      </Box>
      </Box>
    </Box>
  );
}
