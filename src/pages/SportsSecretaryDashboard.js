import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import {
  campusEventsService,
  eventRegistrationsService,
  groundBookingsService,
  liveScoresService,
  teamResultsService
} from '../lib/supabaseService';
import { useAuth } from '../context/AuthContext';
import DashboardBackdrop from '../components/DashboardBackdrop';

const generateBracketPairs = (teams) => {
  const list = [...teams];
  const pairs = [];
  while (list.length > 1) {
    const a = list.shift();
    const b = list.pop();
    pairs.push([a, b || 'BYE']);
  }
  return pairs;
};

export default function SportsSecretaryDashboard() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [scores, setScores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scoreForm, setScoreForm] = useState({ event_id: '', team_a: '', team_b: '', score_a: 0, score_b: 0, status: 'live' });
  const [bookingForm, setBookingForm] = useState({ event_id: '', ground_name: '', booked_for: '', start_time: '', end_time: '', notes: '' });
  const [resultForm, setResultForm] = useState({ event_id: '', winner_name: '', selected_members: '' });

  const sportsEvents = useMemo(() => events.filter((e) => e.category === 'Sports'), [events]);
  const sportsTeams = useMemo(
    () => registrations
      .filter((r) => String(sportsEvents.find((e) => String(e.id) === String(r.event_id))?.id || '') !== '')
      .map((r) => r.team_name || r.user?.full_name)
      .filter(Boolean),
    [registrations, sportsEvents]
  );
  const bracket = useMemo(() => generateBracketPairs(sportsTeams), [sportsTeams]);

  const loadData = async () => {
    try {
      const eventsData = await campusEventsService.getAll();
      setEvents(eventsData || []);
      const regLists = await Promise.all((eventsData || []).map((e) => eventRegistrationsService.getByEvent(e.id)));
      setRegistrations(regLists.flat());
      const scoreLists = await Promise.all((eventsData || []).map((e) => liveScoresService.getByEvent(e.id)));
      setScores(scoreLists.flat());
      const bookingRows = await groundBookingsService.getAll();
      setBookings(bookingRows || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load sports dashboard data. Run add_advanced_dashboard_modules.sql.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpsertScore = async () => {
    try {
      await liveScoresService.upsert({
        ...scoreForm,
        event_id: scoreForm.event_id,
        score_a: Number(scoreForm.score_a || 0),
        score_b: Number(scoreForm.score_b || 0),
        updated_by: currentUser?.id,
        updated_at: new Date().toISOString()
      });
      setMessage('Live score updated.');
      setScoreForm({ event_id: '', team_a: '', team_b: '', score_a: 0, score_b: 0, status: 'live' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to update live score.');
    }
  };

  const handleBookGround = async () => {
    try {
      await groundBookingsService.create({
        ...bookingForm,
        booked_by: currentUser?.id
      });
      setMessage('Ground booked.');
      setBookingForm({ event_id: '', ground_name: '', booked_for: '', start_time: '', end_time: '', notes: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to create ground booking.');
    }
  };

  const handlePublishResult = async () => {
    try {
      await teamResultsService.upsert({
        event_id: resultForm.event_id,
        winner_position: 1,
        winner_name: resultForm.winner_name,
        selected_members: resultForm.selected_members.split(',').map((m) => m.trim()).filter(Boolean),
        declared_by: currentUser?.id
      });
      await campusEventsService.update(resultForm.event_id, { status: 'completed' });
      setMessage('Result published.');
      setResultForm({ event_id: '', winner_name: '', selected_members: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to publish result.');
    }
  };

  return (
    <Box className="dashboard-shell" sx={{ minHeight: '100vh', p: 3 }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Typography variant="h4" color="white" fontWeight={700} sx={{ mb: 2 }}>
          Sports Secretary Dashboard
        </Typography>
        {!!message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card className="dashboard-surface">
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Tournament Bracket" />
              <Tab label="Team Registrations" />
              <Tab label="Live Scores" />
              <Tab label="Ground Booking" />
              <Tab label="Publish Results" />
            </Tabs>

          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" fontWeight={700}>Auto Bracket</Typography>
              {bracket.map((pair, idx) => (
                <Typography key={`${pair[0]}-${pair[1]}-${idx}`} sx={{ mt: 0.5 }}>
                  Match {idx + 1}: {pair[0]} vs {pair[1]}
                </Typography>
              ))}
              {bracket.length === 0 && <Alert severity="info" sx={{ mt: 1 }}>No teams registered yet.</Alert>}
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              {registrations.map((r) => (
                <Card key={r.id} sx={{ mb: 1 }}>
                  <CardContent>
                    <Typography fontWeight={700}>{r.team_name || r.user?.full_name || 'Team/Player'}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.registration_type} | {r.registration_status}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {tab === 2 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Event" value={scoreForm.event_id} onChange={(e) => setScoreForm((p) => ({ ...p, event_id: e.target.value }))}>
                  {sportsEvents.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Team A" value={scoreForm.team_a} onChange={(e) => setScoreForm((p) => ({ ...p, team_a: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Team B" value={scoreForm.team_b} onChange={(e) => setScoreForm((p) => ({ ...p, team_b: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Score A" value={scoreForm.score_a} onChange={(e) => setScoreForm((p) => ({ ...p, score_a: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Score B" value={scoreForm.score_b} onChange={(e) => setScoreForm((p) => ({ ...p, score_b: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Status" value={scoreForm.status} onChange={(e) => setScoreForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="live">Live</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handleUpsertScore}>Update Score</Button></Grid>
              <Grid item xs={12}>{scores.map((s) => <Typography key={s.id} variant="body2">{s.team_a} {s.score_a} - {s.score_b} {s.team_b} ({s.status})</Typography>)}</Grid>
            </Grid>
          )}

          {tab === 3 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Event" value={bookingForm.event_id} onChange={(e) => setBookingForm((p) => ({ ...p, event_id: e.target.value }))}>
                  {sportsEvents.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Ground Name" value={bookingForm.ground_name} onChange={(e) => setBookingForm((p) => ({ ...p, ground_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={bookingForm.booked_for} onChange={(e) => setBookingForm((p) => ({ ...p, booked_for: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="time" label="Start" InputLabelProps={{ shrink: true }} value={bookingForm.start_time} onChange={(e) => setBookingForm((p) => ({ ...p, start_time: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="time" label="End" InputLabelProps={{ shrink: true }} value={bookingForm.end_time} onChange={(e) => setBookingForm((p) => ({ ...p, end_time: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Notes" value={bookingForm.notes} onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handleBookGround}>Book Ground</Button></Grid>
              <Grid item xs={12}>{bookings.map((b) => <Typography key={b.id} variant="body2">{b.ground_name} - {b.booked_for} {b.start_time} to {b.end_time}</Typography>)}</Grid>
            </Grid>
          )}

          {tab === 4 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Event" value={resultForm.event_id} onChange={(e) => setResultForm((p) => ({ ...p, event_id: e.target.value }))}>
                  {sportsEvents.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Winner Name" value={resultForm.winner_name} onChange={(e) => setResultForm((p) => ({ ...p, winner_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Selected Members (comma separated)" value={resultForm.selected_members} onChange={(e) => setResultForm((p) => ({ ...p, selected_members: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handlePublishResult}>Publish Result</Button></Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}
