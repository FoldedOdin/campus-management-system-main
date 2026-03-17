import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campusEventsService, eventRegistrationsService, teamResultsService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import Iridescence from '../components/Iridescence';

const CATEGORY_MAP = {
  cultural: 'Cultural',
  workshops: 'Workshops/Seminar',
  technical: 'Technical',
  fest: 'Fest/College Day',
  sports: 'Sports'
};

const CATEGORY_CARDS = [
  { title: 'Cultural', path: '/student/events/cultural', color: '#ec4899' },
  { title: 'Workshops/Seminar', path: '/student/events/workshops', color: '#22d3ee' },
  { title: 'Technical', path: '/student/events/technical', color: '#f97316' },
  { title: 'Fest/College Day', path: '/student/events/fest', color: '#84cc16' }
];

export default function StudentEventsPage({ forcedCategory = null, titleOverride = '' }) {
  const { category } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    registration_type: 'individual',
    team_name: '',
    team_members: '',
    payment_method: 'cash',
    payment_reference: ''
  });

  const activeCategory = useMemo(() => {
    if (forcedCategory) return forcedCategory;
    return CATEGORY_MAP[category] || null;
  }, [category, forcedCategory]);

  const showCategoryTiles = !activeCategory && !forcedCategory;

  const loadData = async () => {
    try {
      const [eventsData, registrations] = await Promise.all([
        campusEventsService.getVisibleForStudents(),
        currentUser?.id ? eventRegistrationsService.getByUser(currentUser.id) : Promise.resolve([])
      ]);
      const filtered = Array.isArray(activeCategory)
        ? (eventsData || []).filter((e) => activeCategory.includes(e.category))
        : activeCategory
          ? (eventsData || []).filter((e) => e.category === activeCategory)
          : (eventsData || []);
      setEvents(filtered);
      setMyRegistrations(registrations || []);

      const eventIds = filtered.map((e) => e.id);
      if (eventIds.length > 0) {
        const resultLists = await Promise.all(eventIds.map((eventId) => teamResultsService.getByEvent(eventId)));
        setResults(resultLists.flat());
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Failed loading student events', err);
      setError('Could not load events.');
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, currentUser?.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`student-events-${currentUser?.id || 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_events' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_results' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCategory, currentUser?.id]);

  const openRegisterDialog = (event) => {
    setSelectedEvent(event);
    setMessage('');
    setError('');
    setOpenRegister(true);
  };

  const handleRegister = async () => {
    if (!currentUser?.id || !selectedEvent?.id) return;
    try {
      const existing = myRegistrations.find((r) => String(r.event_id) === String(selectedEvent.id));
      if (existing) {
        setError('You already registered for this event.');
        return;
      }

      await eventRegistrationsService.create({
        event_id: selectedEvent.id,
        user_id: currentUser.id,
        registration_type: form.registration_type,
        team_name: form.registration_type === 'team' ? form.team_name || null : null,
        team_members: form.registration_type === 'team'
          ? form.team_members.split(',').map((m) => m.trim()).filter(Boolean)
          : null,
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || null,
        payment_status: form.payment_reference ? 'paid' : 'pending',
        registration_status: 'pending'
      });
      setMessage('Registration submitted successfully.');
      setOpenRegister(false);
      await loadData();
    } catch (err) {
      console.error('Registration failed', err);
      setError('Could not submit registration.');
    }
  };

  const getRegistrationStatus = (eventId) => {
    const row = myRegistrations.find((r) => String(r.event_id) === String(eventId));
    return row?.registration_status || null;
  };

  const registeredEvents = useMemo(
    () => events.filter((event) => !!getRegistrationStatus(event.id)),
    [events, myRegistrations]
  );

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, position: 'relative', overflow: 'hidden' }}>
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
        <Typography variant="h4" color="white" fontWeight="bold" gutterBottom>
          {titleOverride || (Array.isArray(activeCategory) ? 'Filtered Events' : (activeCategory || 'All Events'))}
        </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.86)', mb: 3 }}>
        View events, register (individual/team), and check results/selected members.
      </Typography>
      {showCategoryTiles && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {CATEGORY_CARDS.map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card
                style={{ animationDelay: `${0.06 * index}s` }}
                sx={{ borderRadius: 3, height: '100%' }}
              >
                <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%' }}>
                  <CardContent sx={{ minHeight: 150 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: item.color }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Browse events, details, schedules, and results for this category.
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {!!activeCategory && registeredEvents.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" color="white" fontWeight="bold" gutterBottom>
            Your Registered {activeCategory} Events
          </Typography>
          <Grid container spacing={2}>
            {registeredEvents.map((event) => {
              const regStatus = getRegistrationStatus(event.id);
              return (
                <Grid item xs={12} md={6} key={`reg-${event.id}`}>
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold">{event.event_name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {event.description}
                      </Typography>
                      <Typography variant="body2"><strong>Date/Time:</strong> {event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</Typography>
                      <Typography variant="body2"><strong>Venue:</strong> {event.venue || '-'}</Typography>
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={event.category} />
                        <Chip size="small" color="warning" label={`Reg: ${regStatus}`} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
      {!events.length && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No events available right now.
        </Alert>
      )}

      <Grid container spacing={2}>
        {events.map((event) => {
          const resultRows = results.filter((r) => String(r.event_id) === String(event.id));
          const regStatus = getRegistrationStatus(event.id);
          return (
            <Grid item xs={12} md={6} key={event.id}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold">{event.event_name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {event.description}
                  </Typography>
                  <Typography variant="body2"><strong>Date/Time:</strong> {event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</Typography>
                  <Typography variant="body2"><strong>Venue:</strong> {event.venue || '-'}</Typography>
                  <Typography variant="body2"><strong>Organizer:</strong> {event.organizer || '-'}</Typography>
                  <Typography variant="body2"><strong>Limit:</strong> {event.registration_limit || 'Open'}</Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={event.category} />
                    <Chip size="small" color={event.status === 'published' ? 'success' : 'info'} label={event.status} />
                    {regStatus && <Chip size="small" color="warning" label={`Reg: ${regStatus}`} />}
                  </Box>

                  {!!event.poster_url && (
                    <Box sx={{ mt: 1.5 }}>
                      <a href={event.poster_url} target="_blank" rel="noreferrer">View Poster</a>
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      disabled={!!regStatus || event.status === 'completed'}
                      onClick={() => openRegisterDialog(event)}
                    >
                      Register
                    </Button>
                  </Box>

                  {resultRows.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Results / Selected Members</Typography>
                      {resultRows.map((row) => (
                        <Alert key={row.id} severity="info" sx={{ mt: 1 }}>
                          Position {row.winner_position}: {row.winner_name}
                          {row.selected_members?.length ? ` | Selected: ${row.selected_members.join(', ')}` : ''}
                        </Alert>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={openRegister} onClose={() => setOpenRegister(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register for {selectedEvent?.event_name}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            label="Registration Type"
            value={form.registration_type}
            onChange={(e) => setForm((prev) => ({ ...prev, registration_type: e.target.value }))}
          >
            <MenuItem value="individual">Individual Registration</MenuItem>
            <MenuItem value="team">Team Registration</MenuItem>
          </TextField>

          {form.registration_type === 'team' && (
            <>
              <TextField
                fullWidth
                sx={{ mb: 2 }}
                label="Team Name"
                value={form.team_name}
                onChange={(e) => setForm((prev) => ({ ...prev, team_name: e.target.value }))}
              />
              <TextField
                fullWidth
                sx={{ mb: 2 }}
                label="Team Members (comma separated)"
                value={form.team_members}
                onChange={(e) => setForm((prev) => ({ ...prev, team_members: e.target.value }))}
              />
            </>
          )}

          <TextField
            select
            fullWidth
            sx={{ mb: 2 }}
            label="Payment Method"
            value={form.payment_method}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
          >
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="upi">UPI</MenuItem>
            <MenuItem value="card">Card</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Payment Reference (for online payments)"
            value={form.payment_reference}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_reference: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegister(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegister}>Submit Registration</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
