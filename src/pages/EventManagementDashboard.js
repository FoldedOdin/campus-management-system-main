import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import {
  announcementsService,
  campusEventsService,
  eventCertificatesService,
  eventRegistrationsService,
  teamResultsService,
  usersService,
  storageService
} from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import DashboardBackdrop from '../components/DashboardBackdrop';

const eventCategories = ['Cultural', 'Workshops/Seminar', 'Technical', 'Fest/College Day', 'Sports'];
const roleOptions = [
  'student',
  'staff_coordinator',
  'chairman',
  'admin'
];

const emptyEvent = {
  event_name: '',
  category: 'Cultural',
  description: '',
  event_date: '',
  venue: '',
  organizer: '',
  registration_limit: '',
  poster_url: '',
  status: 'draft'
};

export default function EventManagementDashboard() {
  const { currentUser, logout } = useAuth();
  const [tab, setTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [announcementText, setAnnouncementText] = useState('');
  const [winnerForm, setWinnerForm] = useState({
    event_id: '',
    winner_position: 1,
    winner_name: '',
    selected_members: ''
  });
  const [posterFile, setPosterFile] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isChairman = currentUser?.role === 'chairman';
  const isStaffCoordinator = currentUser?.role === 'staff_coordinator';
  const isEventCoordinator = currentUser?.role === 'event_coordinator';
  const canCreateEditEvents = isAdmin || isStaffCoordinator;
  const canApproveEvents = isAdmin || isChairman;
  const canApproveRegistrations = isAdmin || isStaffCoordinator;
  const canManageUsers = isAdmin;

  const canManageCategory = (category) => {
    if (isAdmin) return true;
    if (isStaffCoordinator) return category === 'Workshops/Seminar';
    if (isEventCoordinator) return true;
    return false;
  };
  const editableCategories = useMemo(
    () => {
      const allowed = eventCategories.filter((category) => canManageCategory(category));
      // Include current event's category if editing and it's not already included
      if (editingEvent?.category && !allowed.includes(editingEvent.category)) {
        allowed.push(editingEvent.category);
      }
      return allowed;
    },
    [isAdmin, isStaffCoordinator, isEventCoordinator, editingEvent]
  );

  const visibleEvents = useMemo(() => {
    if (isAdmin || isChairman || isEventCoordinator) return events;
    if (isStaffCoordinator) return events.filter((e) => e.category === 'Workshops/Seminar');
    return events;
  }, [events, isAdmin, isChairman, isEventCoordinator, isStaffCoordinator]);
  const publishedEvents = visibleEvents.filter((event) => event.status === 'published').length;
  const pendingApprovals = visibleEvents.filter((event) => event.status === 'pending_approval').length;
  const completedEvents = visibleEvents.filter((event) => event.status === 'completed').length;

  const loadData = async () => {
    try {
      const eventsData = await campusEventsService.getAll();
      setEvents(eventsData || []);

    if (isChairman || isAdmin || isStaffCoordinator || isEventCoordinator) {
        const regLists = await Promise.all((eventsData || []).map((e) => eventRegistrationsService.getByEvent(e.id)));
        setRegistrations(regLists.flat());
      }

      if (isAdmin) {
        const usersData = await usersService.getAll();
        setUsers(usersData || []);
      }
    } catch (err) {
      console.error('Failed loading event management data', err);
      setError('Could not load event management data.');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const channel = supabase
      .channel(`events-mgmt-${currentUser?.id || 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_events' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_results' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role]);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setEventForm(emptyEvent);
    setPosterFile(null);
    setOpenEventDialog(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setEventForm({
      event_name: event.event_name || '',
      category: event.category || 'Cultural',
      description: event.description || '',
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      venue: event.venue || '',
      organizer: event.organizer || '',
      registration_limit: event.registration_limit || '',
      poster_url: event.poster_url || '',
      status: event.status || 'draft'
    });
    setPosterFile(null);
    setOpenEventDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!canCreateEditEvents) {
      setError('You do not have permission to create/edit events.');
      return;
    }
    if (!canManageCategory(eventForm.category)) {
      setError('You cannot create/edit this event category.');
      return;
    }
    try {
      let posterUrl = eventForm.poster_url;

      // Upload file if provided
      if (posterFile) {
        posterUrl = await storageService.uploadImage(posterFile, 'event-posters', 'events');
      }

      const payload = {
        event_name: eventForm.event_name,
        category: eventForm.category,
        description: eventForm.description || null,
        event_date: eventForm.event_date || null,
        venue: eventForm.venue || null,
        organizer: eventForm.organizer || null,
        registration_limit: eventForm.registration_limit ? Number(eventForm.registration_limit) : null,
        poster_url: posterUrl || null,
        status: isAdmin ? eventForm.status : 'pending_approval',
        created_by: currentUser?.id
      };

      if (editingEvent?.id) {
        await campusEventsService.update(editingEvent.id, payload);
        setMessage('Event updated.');
      } else {
        await campusEventsService.create(payload);
        setMessage('Event created.');
      }

      setOpenEventDialog(false);
      setPosterFile(null);
      await loadData();
    } catch (err) {
      console.error('Failed saving event', err);
      setError('Could not save event.');
    }
  };

  const handleApproveEvent = async (event, status) => {
    if (!canApproveEvents) return;
    try {
      await campusEventsService.update(event.id, {
        status,
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString()
      });
      setMessage(`Event marked as ${status}.`);
      await loadData();
    } catch (err) {
      console.error('Approval failed', err);
      setError('Could not update event approval.');
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!isChairman && !isAdmin) {
      setError('Only chairman/admin can publish official announcements.');
      return;
    }
    if (!announcementText.trim()) return;
    try {
      await announcementsService.create({
        title: 'Official Event Announcement',
        text: announcementText.trim(),
        priority: 'high',
        author_id: currentUser?.id
      });
      setAnnouncementText('');
      setMessage('Official announcement published.');
    } catch (err) {
      console.error('Failed publishing announcement', err);
      setError('Could not publish announcement.');
    }
  };

  const handleMarkWinner = async () => {
    if (!winnerForm.event_id || !winnerForm.winner_name.trim()) {
      setError('Select event and winner name.');
      return;
    }
    try {
      const result = await teamResultsService.upsert({
        event_id: winnerForm.event_id,
        winner_position: Number(winnerForm.winner_position) || 1,
        winner_name: winnerForm.winner_name.trim(),
        selected_members: winnerForm.selected_members
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        declared_by: currentUser?.id
      });

      const relatedRegs = registrations.filter((r) => String(r.event_id) === String(winnerForm.event_id));
      for (const reg of relatedRegs) {
        const isWinner = winnerForm.winner_name.toLowerCase() === (reg.team_name || reg.user?.full_name || '').toLowerCase();
        if (isWinner) {
          await eventRegistrationsService.update(reg.id, { registration_status: 'selected' });
          if (reg.user_id) {
            await eventCertificatesService.issue({
              event_id: winnerForm.event_id,
              participant_user_id: reg.user_id,
              certificate_url: null,
              certificate_status: 'issued'
            });
          }
        }
      }

      await campusEventsService.update(winnerForm.event_id, { status: 'completed' });
      setMessage(`Winner declared (${result.winner_name}) and certificates issued for selected members.`);
      setWinnerForm({ event_id: '', winner_position: 1, winner_name: '', selected_members: '' });
      await loadData();
    } catch (err) {
      console.error('Failed marking winner', err);
      setError('Could not mark winner.');
    }
  };

  const handleUpdateUserRole = async (userId, role) => {
    if (!isAdmin) return;
    try {
      await usersService.update(userId, { role });
      setMessage('User role updated.');
      await loadData();
    } catch (err) {
      console.error('Role update failed', err);
      setError('Could not update user role.');
    }
  };

  const handleRegistrationStatus = async (registrationId, status) => {
    if (!canApproveRegistrations) return;
    try {
      await eventRegistrationsService.update(registrationId, {
        registration_status: status,
        updated_at: new Date().toISOString()
      });
      setMessage(`Registration marked as ${status}.`);
      await loadData();
    } catch (err) {
      console.error('Registration update failed', err);
      setError('Could not update registration status.');
    }
  };

  return (
    <Box className="dashboard-shell" sx={{ minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h4" color="white" fontWeight="bold" sx={{ letterSpacing: '-0.02em' }}>
            Event Management
          </Typography>
          <Button
            onClick={logout}
            startIcon={<Logout />}
            variant="outlined"
            sx={{
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
        <Typography sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
          Role: {currentUser?.role || '-'} | Admin can override all permissions.
        </Typography>

        {!!message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-kpi">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Visible Events</Typography>
              <Typography variant="h4" fontWeight="bold">{visibleEvents.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-kpi">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Published</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{publishedEvents}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-kpi">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Pending Approval</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{pendingApprovals}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-kpi">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Completed</Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">{completedEvents}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card className="dashboard-surface" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Box className="dashboard-tabbar" sx={{ borderRadius: 2, px: 1 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Events" />
              <Tab label="Participation" />
              <Tab label="Winners/Results" />
              <Tab label="Announcements" />
              {isAdmin && <Tab label="Users" />}
            </Tabs>
          </Box>

          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              {canCreateEditEvents && (
                <Button variant="contained" onClick={handleOpenCreate} sx={{ mb: 2 }}>
                  Create Event
                </Button>
              )}

              <Grid container spacing={2}>
                {visibleEvents.map((event) => (
                  <Grid item xs={12} md={6} key={event.id}>
                    <Card className="dashboard-content-card" variant="outlined">
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold">{event.event_name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{event.description}</Typography>
                        <Typography variant="body2"><strong>Category:</strong> {event.category}</Typography>
                        <Typography variant="body2"><strong>Date:</strong> {event.event_date ? new Date(event.event_date).toLocaleString() : '-'}</Typography>
                        <Typography variant="body2"><strong>Venue:</strong> {event.venue || '-'}</Typography>
                        <Typography variant="body2"><strong>Organizer:</strong> {event.organizer || '-'}</Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" label={event.status} color={event.status === 'approved' || event.status === 'published' ? 'success' : 'warning'} />
                          {event.registration_limit && <Chip size="small" label={`Limit: ${event.registration_limit}`} />}
                        </Box>

                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {canCreateEditEvents && canManageCategory(event.category) && (
                            <Button size="small" variant="outlined" onClick={() => handleOpenEdit(event)}>
                              Edit
                            </Button>
                          )}
                          {canApproveEvents && event.status === 'pending_approval' && (
                            <>
                              <Button size="small" variant="contained" color="success" onClick={() => handleApproveEvent(event, 'approved')}>
                                Approve
                              </Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => handleApproveEvent(event, 'rejected')}>
                                Reject
                              </Button>
                            </>
                          )}
                          {canApproveEvents && (event.status === 'approved' || event.status === 'completed') && (
                            <Button size="small" variant="contained" onClick={() => handleApproveEvent(event, 'published')}>
                              Publish
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Participation Monitoring
              </Typography>
              <Box className="dashboard-table-wrap">
                <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Participant</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Status</TableCell>
                    {canApproveRegistrations && <TableCell>Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.map((reg) => {
                    const event = events.find((e) => String(e.id) === String(reg.event_id));
                    return (
                      <TableRow key={reg.id}>
                        <TableCell>{event?.event_name || '-'}</TableCell>
                        <TableCell>{reg.team_name || reg.user?.full_name || '-'}</TableCell>
                        <TableCell>{reg.registration_type}</TableCell>
                        <TableCell>{reg.payment_status || 'pending'}</TableCell>
                        <TableCell>{reg.registration_status || 'pending'}</TableCell>
                        {canApproveRegistrations && (
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ mr: 1 }}
                              onClick={() => handleRegistrationStatus(reg.id, 'confirmed')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleRegistrationStatus(reg.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Declare Winners / Issue Certificates
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Event"
                    value={winnerForm.event_id}
                    onChange={(e) => setWinnerForm((prev) => ({ ...prev, event_id: e.target.value }))}
                  >
                    {visibleEvents.map((event) => (
                      <MenuItem key={event.id} value={event.id}>{event.event_name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Winner Position"
                    value={winnerForm.winner_position}
                    onChange={(e) => setWinnerForm((prev) => ({ ...prev, winner_position: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Winner Name (individual/team)"
                    value={winnerForm.winner_name}
                    onChange={(e) => setWinnerForm((prev) => ({ ...prev, winner_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Selected Members (comma separated)"
                    value={winnerForm.selected_members}
                    onChange={(e) => setWinnerForm((prev) => ({ ...prev, selected_members: e.target.value }))}
                  />
                </Grid>
              </Grid>
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleMarkWinner}>
                Declare Winner & Issue Certificates
              </Button>
            </Box>
          )}

          {tab === 3 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Publish Official Announcement
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Announcement"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
              />
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                disabled={!isChairman && !isAdmin}
                onClick={handlePublishAnnouncement}
              >
                Publish Announcement
              </Button>
            </Box>
          )}

          {tab === 4 && isAdmin && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Manage Users (Admin Override)
              </Typography>
              <Box className="dashboard-table-wrap">
                <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={user.role || 'student'}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        >
                          {roleOptions.map((role) => (
                            <MenuItem key={role} value={role}>{role}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={openEventDialog} onClose={() => setOpenEventDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Event Name" value={eventForm.event_name} onChange={(e) => setEventForm((p) => ({ ...p, event_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Category"
                value={eventForm.category}
                onChange={(e) => setEventForm((p) => ({ ...p, category: e.target.value }))}
              >
                {editableCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={eventForm.description}
                onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={eventForm.event_date}
                onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Venue" value={eventForm.venue} onChange={(e) => setEventForm((p) => ({ ...p, venue: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Organizer" value={eventForm.organizer} onChange={(e) => setEventForm((p) => ({ ...p, organizer: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Registration Limit" value={eventForm.registration_limit} onChange={(e) => setEventForm((p) => ({ ...p, registration_limit: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Poster</Typography>
              <TextField 
                fullWidth 
                label="Poster URL (optional)" 
                value={eventForm.poster_url} 
                onChange={(e) => setEventForm((p) => ({ ...p, poster_url: e.target.value }))} 
                helperText="Enter a URL or upload an image file below"
              />
              <Box sx={{ mt: 1 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="poster-file"
                  type="file"
                  onChange={(e) => setPosterFile(e.target.files[0])}
                />
                <label htmlFor="poster-file">
                  <Button variant="outlined" component="span" fullWidth>
                    {posterFile ? `Selected: ${posterFile.name}` : 'Upload Poster Image'}
                  </Button>
                </label>
                {posterFile && (
                  <Button 
                    variant="text" 
                    color="error" 
                    size="small" 
                    onClick={() => setPosterFile(null)}
                    sx={{ ml: 1 }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Grid>
            {isAdmin && (
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={eventForm.status}
                  onChange={(e) => setEventForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {['draft', 'pending_approval', 'approved', 'rejected', 'published', 'completed'].map((status) => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEvent}>Save</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
