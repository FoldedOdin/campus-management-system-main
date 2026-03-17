import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import {
  campusEventsService,
  eventCertificatesService,
  eventJudgeAssignmentsService,
  eventRegistrationsService,
  teamResultsService
} from '../lib/supabaseService';
import { useAuth } from '../context/AuthContext';
import DashboardBackdrop from '../components/DashboardBackdrop';

const artsCategories = ['Cultural', 'Workshops/Seminar', 'Technical', 'Fest/College Day'];

export default function ArtsSecretaryDashboard() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [judges, setJudges] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [eventForm, setEventForm] = useState({ event_name: '', category: 'Cultural', description: '', event_date: '', venue: '' });
  const [judgeForm, setJudgeForm] = useState({ event_id: '', judge_name: '', judge_email: '' });
  const [scoreForm, setScoreForm] = useState({ event_id: '', winner_position: 1, winner_name: '', selected_members: '' });

  const artsEvents = useMemo(() => events.filter((e) => e.category !== 'Sports'), [events]);

  const loadData = async () => {
    try {
      const eventsData = await campusEventsService.getAll();
      setEvents(eventsData || []);
      const regLists = await Promise.all((eventsData || []).map((e) => eventRegistrationsService.getByEvent(e.id)));
      setRegistrations(regLists.flat());
      const judgeLists = await Promise.all((eventsData || []).map((e) => eventJudgeAssignmentsService.getByEvent(e.id)));
      setJudges(judgeLists.flat());
    } catch (err) {
      console.error(err);
      setError('Failed to load arts dashboard data. Run add_advanced_dashboard_modules.sql.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEvent = async () => {
    try {
      await campusEventsService.create({
        ...eventForm,
        organizer: 'Arts Secretary Office',
        status: 'pending_approval',
        created_by: currentUser?.id
      });
      setEventForm({ event_name: '', category: 'Cultural', description: '', event_date: '', venue: '' });
      setMessage('Arts event created and sent for approval.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to create arts event.');
    }
  };

  const handleAssignJudge = async () => {
    try {
      await eventJudgeAssignmentsService.create({
        ...judgeForm,
        assigned_by: currentUser?.id
      });
      setJudgeForm({ event_id: '', judge_name: '', judge_email: '' });
      setMessage('Judge assigned.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to assign judge.');
    }
  };

  const handleScoreSubmit = async () => {
    try {
      await teamResultsService.upsert({
        event_id: scoreForm.event_id,
        winner_position: Number(scoreForm.winner_position || 1),
        winner_name: scoreForm.winner_name,
        selected_members: scoreForm.selected_members.split(',').map((m) => m.trim()).filter(Boolean),
        declared_by: currentUser?.id
      });
      setMessage('Scores submitted and result saved.');
      setScoreForm({ event_id: '', winner_position: 1, winner_name: '', selected_members: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to submit scores.');
    }
  };

  const handleGenerateCertificates = async (eventId) => {
    try {
      const rows = registrations.filter((r) => String(r.event_id) === String(eventId));
      for (const row of rows) {
        if (row.user_id) {
          await eventCertificatesService.issue({
            event_id: eventId,
            participant_user_id: row.user_id,
            certificate_url: `AUTO-CERT-${eventId}-${row.user_id}`,
            certificate_status: 'issued'
          });
        }
      }
      setMessage('Certificates generated (auto entries created).');
    } catch (err) {
      console.error(err);
      setError('Failed to generate certificates.');
    }
  };

  return (
    <Box className="dashboard-shell" sx={{ minHeight: '100vh', p: 3 }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Typography variant="h4" color="white" fontWeight={700} sx={{ mb: 2 }}>
          Arts Secretary Dashboard
        </Typography>
        {!!message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card className="dashboard-surface">
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Create Arts Events" />
              <Tab label="Registrations" />
              <Tab label="Judge Panel" />
              <Tab label="Score Entry" />
              <Tab label="Certificates" />
            </Tabs>

          {tab === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}><TextField fullWidth label="Event Name" value={eventForm.event_name} onChange={(e) => setEventForm((p) => ({ ...p, event_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Category" value={eventForm.category} onChange={(e) => setEventForm((p) => ({ ...p, category: e.target.value }))}>
                  {artsCategories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Description" value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="Date & Time" InputLabelProps={{ shrink: true }} value={eventForm.event_date} onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Venue" value={eventForm.venue} onChange={(e) => setEventForm((p) => ({ ...p, venue: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handleCreateEvent}>Create Event</Button></Grid>
            </Grid>
          )}

          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              {registrations.map((row) => (
                <Card key={row.id} sx={{ mb: 1 }}>
                  <CardContent>
                    <Typography fontWeight={700}>{row.team_name || row.user?.full_name || 'Participant'}</Typography>
                    <Typography variant="body2" color="text.secondary">{row.registration_type} | {row.registration_status}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {tab === 2 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Event" value={judgeForm.event_id} onChange={(e) => setJudgeForm((p) => ({ ...p, event_id: e.target.value }))}>
                  {artsEvents.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Judge Name" value={judgeForm.judge_name} onChange={(e) => setJudgeForm((p) => ({ ...p, judge_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Judge Email" value={judgeForm.judge_email} onChange={(e) => setJudgeForm((p) => ({ ...p, judge_email: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handleAssignJudge}>Assign Judge</Button></Grid>
              <Grid item xs={12}>
                {judges.map((j) => <Typography key={j.id} variant="body2">{j.judge_name} ({j.judge_email || 'n/a'})</Typography>)}
              </Grid>
            </Grid>
          )}

          {tab === 3 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Event" value={scoreForm.event_id} onChange={(e) => setScoreForm((p) => ({ ...p, event_id: e.target.value }))}>
                  {artsEvents.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Winner Position" value={scoreForm.winner_position} onChange={(e) => setScoreForm((p) => ({ ...p, winner_position: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Winner Name" value={scoreForm.winner_name} onChange={(e) => setScoreForm((p) => ({ ...p, winner_name: e.target.value }))} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Selected Members (comma separated)" value={scoreForm.selected_members} onChange={(e) => setScoreForm((p) => ({ ...p, selected_members: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={handleScoreSubmit}>Save Scores</Button></Grid>
            </Grid>
          )}

          {tab === 4 && (
            <Box sx={{ mt: 2 }}>
              {artsEvents.map((e) => (
                <Button key={e.id} sx={{ mr: 1, mb: 1 }} variant="outlined" onClick={() => handleGenerateCertificates(e.id)}>
                  Auto Generate Certificates: {e.event_name}
                </Button>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}
