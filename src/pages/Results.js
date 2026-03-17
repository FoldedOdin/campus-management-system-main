import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  HowToVote,
  People,
  TrendingUp,
  Download,
  Print,
  Poll,
  Celebration,
  Logout
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Iridescence from '../components/Iridescence';
import {
  candidatesService,
  votesService,
  electionSettingsService,
  collegeEventRequestsService
} from '../lib/supabaseService';

export default function Results() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [electionSettings, setElectionSettings] = useState(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [blockchainCoverage, setBlockchainCoverage] = useState({ audited: 0, total: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [openEventRequestDialog, setOpenEventRequestDialog] = useState(false);
  const [submittingEventRequest, setSubmittingEventRequest] = useState(false);
  const [winnerEventRequest, setWinnerEventRequest] = useState(null);
  const [eventRequestNotice, setEventRequestNotice] = useState('');
  const [eventRequestError, setEventRequestError] = useState('');
  const [eventRequest, setEventRequest] = useState({
    event_title: '',
    event_description: '',
    proposed_date: ''
  });

  useEffect(() => {
    const loadResults = async () => {
      try {
        const [candidatesList, votesList, settingsList] = await Promise.all([
          candidatesService.getAllAdmin ? candidatesService.getAllAdmin() : candidatesService.getAll(),
          votesService.getAllWithBlockchainAudit(),
          electionSettingsService.getAll()
        ]);

        const auditedVotes = (votesList || []).filter((vote) => vote.has_blockchain_proof);
        const votesForResults = auditedVotes;
        const coveragePercent = votesList.length > 0
          ? Number(((auditedVotes.length / votesList.length) * 100).toFixed(1))
          : 0;

        setBlockchainCoverage({
          audited: auditedVotes.length,
          total: votesList.length,
          percent: coveragePercent
        });

        const voteCounts = votesForResults.reduce((acc, vote) => {
          acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
          return acc;
        }, {});

        const candidatesData = (candidatesList || []).map(candidate => ({
          ...candidate,
          votes: voteCounts[candidate.id] || 0,
          percentage: 0
        }));

        const total = candidatesData.reduce((sum, c) => sum + c.votes, 0);
        const candidatesWithPercentage = candidatesData.map(candidate => ({
          ...candidate,
          percentage: total > 0 ? ((candidate.votes / total) * 100).toFixed(1) : 0
        }));

        candidatesWithPercentage.sort((a, b) => b.votes - a.votes);
        const computedWinner = candidatesWithPercentage.length > 0
          ? candidatesWithPercentage.reduce((prev, current) => (prev.votes > current.votes ? prev : current))
          : null;

        setCandidates(candidatesWithPercentage);
        setTotalVotes(total);

        if (
          computedWinner &&
          currentUser?.id &&
          String(computedWinner.user_id) === String(currentUser.id)
        ) {
          const existingRequests = await collegeEventRequestsService.getByWinnerUser(currentUser.id);
          setWinnerEventRequest(existingRequests[0] || null);
        }

        if (settingsList && settingsList.length > 0) {
          const latest = settingsList[0];
          setElectionSettings({
            id: latest.id,
            title: latest.title,
            description: latest.description,
            startTime: latest.start_date,
            endTime: latest.end_date,
            isActive: latest.is_active
          });
        }
      } catch (err) {
        console.error('Error loading results', err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [currentUser?.id]);

  const getWinner = () => {
    if (candidates.length === 0) return null;
    return candidates.reduce((prev, current) => 
      prev.votes > current.votes ? prev : current
    );
  };

  const COLORS = ['#667eea', '#764ba2', '#00b09b', '#96c93d', '#ff6b6b', '#ffa726'];

  const handleExportResults = () => {
    const resultsData = {
      timestamp: new Date().toISOString(),
      totalVotes,
      candidates,
      winner: getWinner(),
      electionSettings
    };

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `election-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenEventRequestDialog = () => {
    setEventRequestNotice('');
    setEventRequestError('');
    setOpenEventRequestDialog(true);
  };

  const handleSubmitEventRequest = async () => {
    if (!winner || !currentUser?.id) return;
    if (!eventRequest.event_title.trim()) {
      setEventRequestError('Please enter an event title.');
      return;
    }

    setSubmittingEventRequest(true);
    setEventRequestError('');
    setEventRequestNotice('');

    try {
      const pending = await collegeEventRequestsService.getPendingByWinnerUser(currentUser.id);
      if ((pending || []).length > 0) {
        setWinnerEventRequest(pending[0]);
        setEventRequestNotice('You already have a pending request. Please wait for admin approval.');
        setOpenEventRequestDialog(false);
        return;
      }

      const created = await collegeEventRequestsService.create({
        winner_candidate_id: winner.id,
        winner_user_id: currentUser.id,
        event_title: eventRequest.event_title.trim(),
        event_description: eventRequest.event_description.trim() || null,
        proposed_date: eventRequest.proposed_date || null,
        status: 'pending'
      });

      setWinnerEventRequest(created);
      setEventRequestNotice('College events handling request submitted for admin approval.');
      setOpenEventRequestDialog(false);
      setEventRequest({
        event_title: '',
        event_description: '',
        proposed_date: ''
      });
    } catch (err) {
      console.error('Error submitting college event request', err);
      setEventRequestError('Failed to submit request. Please try again.');
    } finally {
      setSubmittingEventRequest(false);
    }
  };

  const winner = getWinner();
  const isWinnerLoggedIn = !!winner && !!currentUser?.id && String(winner.user_id) === String(currentUser.id);

  const getElectionStatus = () => {
    if (!electionSettings) return 'not_started';

    try {
      const now = new Date();
      const start = new Date(electionSettings.startTime);
      const end = new Date(electionSettings.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'not_started';
      if (now < start) return 'scheduled';
      if (now >= start && now <= end) return 'active';
      if (now > end) return 'ended';
    } catch (err) {
      console.error('Invalid electionSettings', err, electionSettings);
      return 'not_started';
    }
  };

  const getTimeRemaining = () => {
    if (!electionSettings) return null;
    try {
      const now = new Date();
      const end = new Date(electionSettings.endTime);
      if (isNaN(end.getTime())) return null;
      const diff = end - now;
      if (diff <= 0) return 'Election ended';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch (err) {
      console.error('Error computing time remaining', err);
      return null;
    }
  };

  const electionStatus = getElectionStatus();
  const timeRemaining = getTimeRemaining();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading results...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'transparent',
      p: 3,
      position: 'relative',
      overflow: 'hidden'
    }}>
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
        <Paper
          elevation={8}
          sx={{
            maxWidth: 1400,
            mx: 'auto',
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)'
          }}
        >
        <Box sx={{ 
          background: 'linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)',
          color: 'white',
          p: 4,
          textAlign: 'center'
        }}>
          <HowToVote sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Election Results 2024
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            {electionSettings?.isActive ? 'Live Results' : 'Final Results'}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 3 }}>
            <Chip 
              label={`${totalVotes} Total Votes`}
              icon={<People />}
              sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            <Chip
              label={`${blockchainCoverage.percent}% Blockchain Verified`}
              icon={<Poll />}
              sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            <Chip 
              label={`${candidates.length} Candidates`}
              icon={<HowToVote />}
              sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            {winner && (
              <Chip 
                label={`Winner: ${winner.name}`}
                icon={<TrendingUp />}
                color="success"
                sx={{ color: 'white' }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ p: 4 }}>
          {(electionStatus !== 'ended') ? (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Results available after election ends
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                The detailed results and graphs will be shown once the election period has completed.
              </Typography>
              {electionSettings?.startTime && electionSettings?.endTime && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Election Period: {new Date(electionSettings.startTime).toLocaleString()} → {new Date(electionSettings.endTime).toLocaleString()}
                </Typography>
              )}
              {timeRemaining && electionStatus === 'active' && (
                <Chip label={`${timeRemaining} remaining`} icon={<Poll />} sx={{ mt: 1 }} />
              )}
              <Box sx={{ mt: 3 }}>
                <Button variant="outlined" onClick={() => navigate(currentUser?.role === 'admin' ? '/admin' : '/student')}>Back to Dashboard</Button>
              </Box>
            </Paper>
          ) : (
            winner && winner.votes > 0 && (
            <Paper 
              elevation={3} 
              sx={{ 
                p: 4, 
                mb: 4, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
                color: 'white',
                textAlign: 'center'
              }}
            >
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                🏆 Election Winner 🏆
              </Typography>
              <Avatar
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mx: 'auto', 
                  mb: 2,
                  background: 'white',
                  color: '#00b09b',
                  fontSize: '2.5rem',
                  fontWeight: 'bold'
                }}
              >
                {winner.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                {winner.name}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {winner.party}
              </Typography>
              <Typography variant="h6">
                {winner.votes} votes ({winner.percentage}%)
              </Typography>

              {isWinnerLoggedIn && (
                <Box sx={{ mt: 3, mx: 'auto', maxWidth: 700 }}>
                  <Alert
                    severity={
                      winnerEventRequest?.status === 'approved'
                        ? 'success'
                        : winnerEventRequest?.status === 'rejected'
                          ? 'error'
                          : 'info'
                    }
                    sx={{ textAlign: 'left', mb: 2 }}
                  >
                    {winnerEventRequest?.status === 'pending' && 'Your college events handling request is pending admin approval.'}
                    {winnerEventRequest?.status === 'approved' && 'Your college events handling request has been approved by admin.'}
                    {winnerEventRequest?.status === 'rejected' && 'Your college events handling request was rejected by admin.'}
                    {!winnerEventRequest?.status && 'As the winner, you can request to handle college events.'}
                    {!!winnerEventRequest?.admin_notes && ` Admin note: ${winnerEventRequest.admin_notes}`}
                  </Alert>

                  {!!eventRequestNotice && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {eventRequestNotice}
                    </Alert>
                  )}
                  {!!eventRequestError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {eventRequestError}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Celebration />}
                    onClick={handleOpenEventRequestDialog}
                    disabled={winnerEventRequest?.status === 'pending'}
                  >
                    Request College Events Handling
                  </Button>
                </Box>
              )}
            </Paper>
          ))}

          {electionStatus === 'ended' && (
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Vote Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={candidates}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="votes" fill="#667eea" name="Votes" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Percentage Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={candidates}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="votes"
                    >
                      {candidates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Detailed Results
                  </Typography>
                  <Box>
                    <IconButton onClick={handleExportResults} title="Export">
                      <Download />
                    </IconButton>
                    <IconButton onClick={handlePrint} title="Print">
                      <Print />
                    </IconButton>
                  </Box>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Candidate</TableCell>
                        <TableCell align="right">Votes</TableCell>
                        <TableCell align="right">%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidates.map((candidate, index) => (
                        <TableRow 
                          key={candidate.id}
                          sx={{ 
                            background: index === 0 ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                            fontWeight: index === 0 ? 'bold' : 'normal'
                          }}
                        >
                          <TableCell>
                            <Chip 
                              label={`#${index + 1}`}
                              size="small"
                              color={index === 0 ? "success" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ 
                                width: 30, 
                                height: 30, 
                                fontSize: '0.8rem',
                                bgcolor: COLORS[index % COLORS.length]
                              }}>
                                {candidate.name.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={index === 0 ? "bold" : "normal"}>
                                  {candidate.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {candidate.party}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {candidate.votes}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {candidate.percentage}%
                              </Typography>
                              <Box sx={{ width: 60 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={candidate.percentage} 
                                  color={index === 0 ? "success" : "primary"}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
          )}

          {electionStatus === 'ended' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, pt: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportResults}
              sx={{ borderRadius: 3 }}
            >
              Export Results
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ borderRadius: 3 }}
            >
              Print Results
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => navigate(currentUser.role === 'admin' ? '/admin' : '/student')}
              sx={{ borderRadius: 3 }}
            >
              Back to Dashboard
            </Button>
            
            <Button
              variant="outlined"
              onClick={logout}
              startIcon={<Logout />}
              sx={{ borderRadius: 3 }}
            >
              Logout
            </Button>
          </Box>
          )}
        </Box>
      </Paper>

      <Dialog
        open={openEventRequestDialog}
        onClose={() => setOpenEventRequestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>College Events Handling Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Submit your request as the winning candidate. Admin approval is required before you can handle college events.
          </Typography>

          <TextField
            fullWidth
            label="Event Title"
            value={eventRequest.event_title}
            onChange={(e) => setEventRequest((prev) => ({ ...prev, event_title: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="Example: College Cultural Fest 2026"
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Event Plan / Description"
            value={eventRequest.event_description}
            onChange={(e) => setEventRequest((prev) => ({ ...prev, event_description: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="Describe how you will handle this event."
          />

          <TextField
            fullWidth
            label="Proposed Date"
            type="datetime-local"
            value={eventRequest.proposed_date}
            onChange={(e) => setEventRequest((prev) => ({ ...prev, proposed_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventRequestDialog(false)} disabled={submittingEventRequest}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitEventRequest}
            variant="contained"
            disabled={submittingEventRequest}
          >
            Submit for Approval
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

