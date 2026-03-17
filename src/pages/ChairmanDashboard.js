import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import {
  announcementsService,
  approvalLogsService,
  campusEventsService,
  conflictTicketsService,
  eventRegistrationsService,
  fundAllocationsService,
  fundUsageLogsService,
  usersService,
  votesService
} from '../lib/supabaseService';
import { useAuth } from '../context/AuthContext';
import DashboardBackdrop from '../components/DashboardBackdrop';

export default function ChairmanDashboard() {
  const { currentUser, logout } = useAuth();
  const [tab, setTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [usages, setUsages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementImageUrl, setAnnouncementImageUrl] = useState('');
  const [roleAssignment, setRoleAssignment] = useState({ user_id: '', role: 'arts_secretary' });
  const [allocationForm, setAllocationForm] = useState({ title: '', department: 'General', allocated_amount: '', notes: '' });
  const [usageForm, setUsageForm] = useState({ department: 'General', event_id: '', used_amount: '', usage_note: '' });
  const [ticketForm, setTicketForm] = useState({ event_id: '', title: '', description: '', priority: 'medium' });
  const [analytics, setAnalytics] = useState({ participation: 0, votes: 0, fundsAllocated: 0, fundsUsed: 0 });

  const pendingEvents = useMemo(() => events.filter((e) => e.status === 'pending_approval'), [events]);

  const loadData = async () => {
    try {
      const [eventsData, allocs, usageRows, ticketRows, votes, usersData] = await Promise.all([
        campusEventsService.getAll(),
        fundAllocationsService.getAll(),
        fundUsageLogsService.getAll(),
        conflictTicketsService.getAll(),
        votesService.getAllWithBlockchainAudit(),
        usersService.getAll()
      ]);
      setEvents(eventsData || []);
      setAllocations(allocs || []);
      setUsages(usageRows || []);
      setTickets(ticketRows || []);
      setUsers(usersData || []);

      const regsByEvent = await Promise.all((eventsData || []).map((e) => eventRegistrationsService.getByEvent(e.id)));
      const totalRegs = regsByEvent.flat().length;
      const activeEvents = (eventsData || []).length || 1;
      const participation = Number(((totalRegs / activeEvents) * 100).toFixed(1));
      const fundsAllocated = (allocs || []).reduce((sum, row) => sum + Number(row.allocated_amount || 0), 0);
      const fundsUsed = (usageRows || []).reduce((sum, row) => sum + Number(row.used_amount || 0), 0);
      setAnalytics({ participation, votes: (votes || []).length, fundsAllocated, fundsUsed });
    } catch (err) {
      console.error(err);
      setError('Failed to load chairman dashboard data. Run add_advanced_dashboard_modules.sql.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const logApproval = async (event, toStatus) => {
    await approvalLogsService.create({
      entity_type: 'campus_event',
      entity_id: String(event.id),
      action: 'status_change',
      from_status: event.status,
      to_status: toStatus,
      approved_by: currentUser?.id,
      notes: 'Approved/rejected by chairman'
    });
  };

  const handleEventDecision = async (event, status) => {
    try {
      await campusEventsService.update(event.id, {
        status,
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString()
      });
      await logApproval(event, status);
      setMessage(`Event "${event.event_name}" marked as ${status}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to update event status.');
    }
  };

  const handleCreateAllocation = async () => {
    if (!currentUser?.id) {
      setError('Missing user session. Please sign in again.');
      return;
    }
    try {
      await fundAllocationsService.create({
        ...allocationForm,
        allocated_amount: Number(allocationForm.allocated_amount || 0),
        allocated_by: currentUser?.id
      });
      setAllocationForm({ title: '', department: 'General', allocated_amount: '', notes: '' });
      setMessage('Budget allocated.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to allocate budget.');
    }
  };

  const handleLogUsage = async () => {
    if (!currentUser?.id) {
      setError('Missing user session. Please sign in again.');
      return;
    }
    if (!Number(usageForm.used_amount || 0)) {
      setError('Enter a valid used amount.');
      return;
    }
    try {
      await fundUsageLogsService.create({
        ...usageForm,
        event_id: usageForm.event_id || null,
        used_amount: Number(usageForm.used_amount || 0),
        logged_by: currentUser?.id
      });
      setUsageForm({ department: 'General', event_id: '', used_amount: '', usage_note: '' });
      setMessage('Fund usage logged.');
      await loadData();
    } catch (err) {
      console.error(err);
      const raw = err?.message || '';
      const isRls =
        err?.code === '42501' || /row-level security|permission denied/i.test(raw);
      const isMissingTable = /does not exist|relation .*fund_usage_logs/i.test(raw);
      if (isRls) {
        setError('Permission denied for fund usage logs. Update Supabase RLS/policies for chairman.');
      } else if (isMissingTable) {
        setError('Fund usage logs table is missing. Run add_advanced_dashboard_modules.sql in Supabase.');
      } else {
        setError('Failed to log fund usage.');
      }
    }
  };

  const handleCreateTicket = async () => {
    try {
      await conflictTicketsService.create({
        ...ticketForm,
        event_id: ticketForm.event_id || null,
        raised_by: currentUser?.id,
        status: 'open'
      });
      setTicketForm({ event_id: '', title: '', description: '', priority: 'medium' });
      setMessage('Conflict ticket created.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to create ticket.');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await conflictTicketsService.update(ticketId, {
        status: 'resolved',
        updated_at: new Date().toISOString()
      });
      setMessage('Ticket resolved.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to resolve ticket.');
    }
  };

  const handleAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      let textPayload = announcementText.trim();
      if (announcementImageUrl.trim()) {
        // Prepend image markdown so student dashboard can render a poster image.
        textPayload = `![Poster](${announcementImageUrl.trim()})\n\n${textPayload}`;
      }
      await announcementsService.create({
        title: 'Chairman Announcement',
        text: textPayload,
        priority: 'high',
        author_id: currentUser?.id
      });
      setAnnouncementText('');
      setAnnouncementImageUrl('');
      setMessage('Global announcement published.');
    } catch (err) {
      console.error(err);
      setError('Failed to publish announcement.');
    }
  };

  const handlePosterFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAnnouncementImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAssignRole = async () => {
    if (!roleAssignment.user_id) {
      setError('Select a user to assign the role.');
      return;
    }
    try {
      await usersService.update(roleAssignment.user_id, {
        role: roleAssignment.role,
        updated_at: new Date().toISOString()
      });
      setMessage('Council role assigned.');
      setRoleAssignment({ user_id: '', role: 'arts_secretary' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to assign council role.');
    }
  };

  return (
    <Box className="dashboard-shell" sx={{ minHeight: '100vh', p: 3 }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" color="white" fontWeight={700}>
            Chairman Dashboard
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
        {!!message && <Alert sx={{ mb: 2 }} severity="success">{message}</Alert>}
        {!!error && <Alert sx={{ mb: 2 }} severity="error">{error}</Alert>}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}><Card className="dashboard-kpi"><CardContent><Typography variant="overline">Participation %</Typography><Typography variant="h4">{analytics.participation}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card className="dashboard-kpi"><CardContent><Typography variant="overline">Votes</Typography><Typography variant="h4">{analytics.votes}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card className="dashboard-kpi"><CardContent><Typography variant="overline">Funds Allocated</Typography><Typography variant="h4">{analytics.fundsAllocated}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card className="dashboard-kpi"><CardContent><Typography variant="overline">Funds Used</Typography><Typography variant="h4">{analytics.fundsUsed}</Typography></CardContent></Card></Grid>
        </Grid>

      <Card className="dashboard-surface">
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Event Approvals" />
            <Tab label="Budget Panel" />
            <Tab label="Announcements" />
            <Tab label="Conflict Tickets" />
            <Tab label="Analytics" />
            <Tab label="Council Roles" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              {pendingEvents.map((event) => (
                <Card key={event.id} sx={{ mb: 1.5 }}>
                  <CardContent>
                    <Typography fontWeight={700}>{event.event_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{event.description}</Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" color="success" onClick={() => handleEventDecision(event, 'approved')}>Approve</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleEventDecision(event, 'rejected')}>Reject</Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {pendingEvents.length === 0 && <Alert severity="info">No pending events.</Alert>}
            </Box>
          )}

          {tab === 1 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Allocate Budget</Typography>
                <TextField fullWidth label="Title" value={allocationForm.title} onChange={(e) => setAllocationForm((p) => ({ ...p, title: e.target.value }))} sx={{ mb: 1 }} />
                <TextField fullWidth label="Department" value={allocationForm.department} onChange={(e) => setAllocationForm((p) => ({ ...p, department: e.target.value }))} sx={{ mb: 1 }} />
                <TextField fullWidth label="Amount" type="number" value={allocationForm.allocated_amount} onChange={(e) => setAllocationForm((p) => ({ ...p, allocated_amount: e.target.value }))} sx={{ mb: 1 }} />
                <TextField fullWidth label="Notes" multiline rows={2} value={allocationForm.notes} onChange={(e) => setAllocationForm((p) => ({ ...p, notes: e.target.value }))} sx={{ mb: 1 }} />
                <Button variant="contained" onClick={handleCreateAllocation}>Allocate</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Fund Usage Log</Typography>
                <TextField fullWidth label="Department" value={usageForm.department} onChange={(e) => setUsageForm((p) => ({ ...p, department: e.target.value }))} sx={{ mb: 1 }} />
                <TextField select fullWidth label="Event" value={usageForm.event_id} onChange={(e) => setUsageForm((p) => ({ ...p, event_id: e.target.value }))} sx={{ mb: 1 }}>
                  <MenuItem value="">None</MenuItem>
                  {events.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="Used Amount" type="number" value={usageForm.used_amount} onChange={(e) => setUsageForm((p) => ({ ...p, used_amount: e.target.value }))} sx={{ mb: 1 }} />
                <TextField fullWidth label="Usage Note" multiline rows={2} value={usageForm.usage_note} onChange={(e) => setUsageForm((p) => ({ ...p, usage_note: e.target.value }))} sx={{ mb: 1 }} />
                <Button variant="contained" onClick={handleLogUsage}>Log Usage</Button>
              </Grid>
            </Grid>
          )}

          {tab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  fullWidth
                  label="Poster Image URL (optional)"
                  value={announcementImageUrl}
                  onChange={(e) => setAnnouncementImageUrl(e.target.value)}
                  helperText="Add a link OR upload an image to display as a poster in the student announcement gallery."
                  sx={{ mb: 1 }}
                />
                <input
                  id="announcement-poster-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePosterFileChange}
                />
                <label htmlFor="announcement-poster-upload">
                  <Button variant="outlined" component="span" sx={{ height: 40, mt: 1 }}>
                    Upload
                  </Button>
                </label>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Global Announcement"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
              />
              <Button sx={{ mt: 1.5 }} variant="contained" onClick={handleAnnouncement}>
                Publish
              </Button>

              {(announcementText.trim() || announcementImageUrl.trim()) && (
                <Box sx={{ mt: 3, p: 2, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    Preview
                  </Typography>
                  {announcementImageUrl.trim() && (
                    <Box sx={{ mb: 2, position: 'relative', borderRadius: 2, overflow: 'hidden', height: 180 }}>
                      <img
                        src={announcementImageUrl}
                        alt="Poster Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)'
                        }}
                      />
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {announcementText.trim() || 'No announcement text yet.'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {tab === 3 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Raise Ticket</Typography>
                <TextField select fullWidth label="Event" value={ticketForm.event_id} onChange={(e) => setTicketForm((p) => ({ ...p, event_id: e.target.value }))} sx={{ mb: 1 }}>
                  <MenuItem value="">None</MenuItem>
                  {events.map((e) => <MenuItem key={e.id} value={e.id}>{e.event_name}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="Title" value={ticketForm.title} onChange={(e) => setTicketForm((p) => ({ ...p, title: e.target.value }))} sx={{ mb: 1 }} />
                <TextField fullWidth multiline rows={3} label="Description" value={ticketForm.description} onChange={(e) => setTicketForm((p) => ({ ...p, description: e.target.value }))} sx={{ mb: 1 }} />
                <TextField select fullWidth label="Priority" value={ticketForm.priority} onChange={(e) => setTicketForm((p) => ({ ...p, priority: e.target.value }))} sx={{ mb: 1 }}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </TextField>
                <Button variant="contained" onClick={handleCreateTicket}>Create Ticket</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Open Tickets</Typography>
                {tickets.map((t) => (
                  <Card key={t.id} sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography fontWeight={700}>{t.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{t.description}</Typography>
                      <Typography variant="caption">Priority: {t.priority} | Status: {t.status}</Typography>
                      {t.status !== 'resolved' && (
                        <Box sx={{ mt: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => handleResolveTicket(t.id)}>Resolve</Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Grid>
          )}

          {tab === 4 && (
            <Box sx={{ mt: 2 }}>
              <Typography>Participation: {analytics.participation}%</Typography>
              <Typography>Total Votes: {analytics.votes}</Typography>
              <Typography>Fund Usage: {analytics.fundsUsed} / {analytics.fundsAllocated}</Typography>
              <Typography sx={{ mt: 1 }} variant="body2" color="text.secondary">
                Includes participation %, votes, and fund usage metrics for governance reviews.
              </Typography>
            </Box>
          )}

          {tab === 5 && (
            <Box sx={{ mt: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Assign Council Roles
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Select User"
                    value={roleAssignment.user_id}
                    onChange={(e) => setRoleAssignment((p) => ({ ...p, user_id: e.target.value }))}
                  >
                    <MenuItem value="">Choose user</MenuItem>
                    {users
                      .filter((u) => u.role !== 'admin')
                      .map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Council Role"
                    value={roleAssignment.role}
                    onChange={(e) => setRoleAssignment((p) => ({ ...p, role: e.target.value }))}
                  >
                    <MenuItem value="staff_coordinator">Staff Coordinator</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleAssignRole}>
                    Assign Role
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  Current Council Roles
                </Typography>
                {users.filter((u) => ['arts_secretary', 'sports_secretary', 'magazine_editor', 'event_coordinator'].includes(u.role)).length === 0 && (
                  <Alert severity="info">No council roles assigned yet.</Alert>
                )}
                {users
                  .filter((u) => ['arts_secretary', 'sports_secretary', 'magazine_editor', 'event_coordinator'].includes(u.role))
                  .map((u) => (
                    <Card key={u.id} sx={{ mb: 1 }}>
                      <CardContent>
                        <Typography fontWeight={700}>{u.full_name || u.email}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {u.role.replace('_', ' ')}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}
