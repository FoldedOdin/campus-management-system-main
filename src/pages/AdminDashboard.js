import React, { useState, useEffect } from "react";
import { 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  Box, 
  Typography, 
  IconButton,
  Paper,
  Avatar,
  Grid,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Snackbar,
  Fade,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from "@mui/material";
import { 
  Add, 
  Logout, 
  Announcement, 
  Delete, 
  Dashboard,
  Notifications,
  PersonAdd,
  Schedule,
  HowToVote,
  People,
  CheckCircle,
  PlayArrow,
  Stop,
  Edit,
  Visibility,
  Download,
  Print,
  Refresh,
  Settings,
  Analytics,
  Security,
  AdminPanelSettings,
  Menu,
  Close,
  Email,
  Phone,
  TrendingUp,
  VerifiedUser,
  Block,
  CheckCircleOutline,
  Warning
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { votesService, collegeEventRequestsService } from "../lib/supabaseService";
import { createElectionOnChain, isBlockchainVoteEnabled } from "../lib/blockchainService";
import DashboardBackdrop from "../components/DashboardBackdrop";

const TabPanel = ({ children, value, index, ...other }) => (
  <div hidden={value !== index} {...other}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export default function AdminDashboard() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [openPositionDialog, setOpenPositionDialog] = useState(false);
  const [newPositionName, setNewPositionName] = useState("");
  const [editPosition, setEditPosition] = useState(null);
  const [editCandidate, setEditCandidate] = useState(null);
  const [electionSettings, setElectionSettings] = useState({
    startTime: "",
    endTime: "",
    isActive: false,
    title: "Student Council Election 2024",
    description: "Annual student council elections",
    maxVotesPerStudent: 1,
    allowWriteIn: false,
    requireVerification: true
  });
  const [openElectionDialog, setOpenElectionDialog] = useState(false);
  const [voters, setVoters] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidateRequests, setCandidateRequests] = useState([]);
  const [collegeEventRequests, setCollegeEventRequests] = useState([]);
  const [openRequestDetailDialog, setOpenRequestDetailDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [votes, setVotes] = useState([]);
  const [blockchainCoverage, setBlockchainCoverage] = useState({
    auditedVotes: 0,
    unauditedVotes: 0,
    coverage: 0
  });
  const [analytics, setAnalytics] = useState({
    totalVotes: 0,
    totalVoters: 0,
    voted: 0,
    notVoted: 0,
    turnout: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        positionsRes,
        candidatesRes,
        postsRes,
        usersRes,
        requestsRes,
        settingsRes,
        votesData,
        collegeEventRequestsData
      ] = await Promise.all([
        supabase.from('positions').select('*').order('created_at', { ascending: true }),
        supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        supabase
          .from('announcements')
          .select('id,title,content,priority,author_id,created_at,author:users(id, full_name, email)')
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase
          .from('candidate_requests')
          .select('id,position_id,user_id,bio,party,manifesto,email,phone,status,created_at,updated_at,position:positions(id, name),user:users(id, full_name, email, department, year, phone, student_id)')
          .order('created_at', { ascending: false }),
        supabase.from('election_settings').select('*').order('created_at', { ascending: false }).limit(1),
        votesService.getAllWithBlockchainAudit(),
        collegeEventRequestsService.getAll()
      ]);

      if (positionsRes.error) throw positionsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (postsRes.error) throw postsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (requestsRes.error) throw requestsRes.error;
      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw settingsRes.error;

      const positionsData = positionsRes.data || [];
      const candidatesData = candidatesRes.data || [];
      const postsDataRaw = postsRes.data || [];
      const usersData = usersRes.data || [];
      const requestsDataRaw = requestsRes.data || [];
      const settingsDataRaw = settingsRes.data && settingsRes.data.length > 0 ? settingsRes.data[0] : null;

      setPositions(positionsData);
      setCandidates(candidatesData);
      const mappedPosts = postsDataRaw.map((p) => ({
        id: p.id,
        title: p.title,
        text: p.content,
        priority: p.priority,
        author: p.author?.full_name || 'Admin',
        timestamp: p.created_at
      }));
      setPosts(mappedPosts);

      const mappedRequests = requestsDataRaw.map((r) => ({
        ...r,
        studentName: r.user?.full_name || 'Student',
        studentEmail: r.user?.email || r.email || '',
        studentDepartment: r.user?.department || '',
        studentYear: r.user?.year || '',
        registrationNumber: r.user?.student_id || '',
        positionName: r.position?.name || '',
        createdAt: r.created_at,
        processedAt: r.updated_at
      }));
      setCandidateRequests(mappedRequests);
      setCollegeEventRequests(
        (collegeEventRequestsData || []).map((r) => ({
          ...r,
          winnerName: r.candidate?.name || r.user?.full_name || 'Winner',
          winnerEmail: r.user?.email || '',
          candidateParty: r.candidate?.party || '',
          createdAt: r.created_at,
          processedAt: r.updated_at
        }))
      );
      setVotes(votesData);

      const studentVoters = usersData.filter(user => user.role === 'student');
      setVoters(studentVoters);

      if (settingsDataRaw) {
        setElectionSettings({
          ...electionSettings,
          ...settingsDataRaw,
          startTime: settingsDataRaw.start_date || '',
          endTime: settingsDataRaw.end_date || '',
          isActive: !!settingsDataRaw.is_active
        });
      }

      calculateResults(candidatesData, votesData);
      calculateAnalytics(studentVoters, votesData);
    } catch (error) {
      console.error("Error loading data:", error);
      showSnackbar(getVotesAccessErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };


  const calculateAnalytics = (voterList = voters, votesList = votes) => {
    const totalVotes = votesList.length;
    const totalVoters = voterList.length;
    const votedCount = new Set(votesList.map(v => v.student_id)).size;
    const turnout = totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : 0;
    const auditedVotes = votesList.filter(v => v.has_blockchain_proof).length;
    const coverage = totalVotes > 0 ? ((auditedVotes / totalVotes) * 100).toFixed(1) : 0;

    setAnalytics({
      totalVotes,
      totalVoters,
      voted: votedCount,
      notVoted: totalVoters - votedCount,
      turnout
    });

    setBlockchainCoverage({
      auditedVotes,
      unauditedVotes: totalVotes - auditedVotes,
      coverage
    });
  };

  const calculateResults = (candidatesList = candidates, votesList = votes) => {
    const auditedVotes = votesList.filter(v => v.has_blockchain_proof);
    const countedVotes = auditedVotes;
    const voteCounts = {};
    for (const vote of countedVotes) {
      if (vote && vote.candidate_id != null) {
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1;
      }
    }

    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

    const resultsWithCandidates = candidatesList.map(candidate => ({
      ...candidate,
      votes: voteCounts[candidate.id] || 0,
      percentage: totalVotes > 0 ? (((voteCounts[candidate.id] || 0) / totalVotes) * 100).toFixed(1) : 0
    })).sort((a, b) => b.votes - a.votes);

    setResults(resultsWithCandidates);
  };

  const getPositionAnalytics = (positionsList = positions, candidatesList = candidates, votesList = votes) => {
    if (!positionsList || positionsList.length === 0) {
      const voteCounts = {};
      (votesList || []).forEach((vote) => {
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1;
      });
      const topCandidate = (candidatesList || []).reduce((best, candidate) => {
        const count = voteCounts[candidate.id] || 0;
        if (!best || count > best.count) return { name: candidate.name, count };
        return best;
      }, null);

      return [
        {
          id: 'general',
          name: 'General',
          totalVotes: (votesList || []).length,
          uniqueVoters: new Set((votesList || []).map((v) => v.student_id)).size,
          leadingCandidate: topCandidate?.name || '-',
          leadingVotes: topCandidate?.count || 0
        }
      ];
    }

    return positionsList.map((position) => {
      const positionVotes = (votesList || []).filter(
        (vote) => String(vote.position_id) === String(position.id)
      );
      const voteCounts = {};
      positionVotes.forEach((vote) => {
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1;
      });

      const positionCandidates = (candidatesList || []).filter(
        (candidate) => String(candidate.position_id) === String(position.id)
      );

      const topCandidate = positionCandidates.reduce((best, candidate) => {
        const count = voteCounts[candidate.id] || 0;
        if (!best || count > best.count) return { name: candidate.name, count };
        return best;
      }, null);

      return {
        id: position.id,
        name: position.name,
        totalVotes: positionVotes.length,
        uniqueVoters: new Set(positionVotes.map((v) => v.student_id)).size,
        leadingCandidate: topCandidate?.name || '-',
        leadingVotes: topCandidate?.count || 0
      };
    }).sort((a, b) => b.totalVotes - a.totalVotes);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const getVotesAccessErrorMessage = (err) => {
    const rawMessage = err?.message || "";
    const isRlsError =
      err?.code === "42501" ||
      /row-level security|permission denied/i.test(rawMessage);

    if (isRlsError) {
      return "Permission denied for votes/results. Apply fix_votes_rls.sql in Supabase and confirm the account role is admin.";
    }

    return "Error loading dashboard data";
  };

  const getPositionMutationErrorMessage = (err, action) => {
    const rawMessage = err?.message || "";
    const isRlsError =
      err?.code === "42501" ||
      /row-level security|permission denied/i.test(rawMessage);

    if (isRlsError) {
      return "Permission denied for positions. Apply fix_positions_rls.sql in Supabase and confirm the account role is admin.";
    }

    return `Failed to ${action} position`;
  };

  const getAnnouncementMutationErrorMessage = (err, action) => {
    const rawMessage = err?.message || "";
    const isRlsError =
      err?.code === "42501" ||
      /row-level security|permission denied/i.test(rawMessage);

    if (isRlsError) {
      return "Permission denied for announcements. Apply fix_announcements_rls.sql in Supabase and confirm the account role is admin.";
    }

    return `Failed to ${action} announcement`;
  };

  const getCandidateMutationErrorMessage = (err, action) => {
    const rawMessage = err?.message || "";
    const isRlsError =
      err?.code === "42501" ||
      /row-level security|permission denied/i.test(rawMessage);
    const isSchemaError = /column .* does not exist/i.test(rawMessage);

    if (isRlsError) {
      return "Permission denied for candidates. Apply fix_candidates_rls.sql in Supabase and confirm the account role is admin.";
    }
    if (isSchemaError) {
      return "Candidates table schema mismatch. Run the latest schema.sql in Supabase.";
    }

    return `Failed to ${action} candidate`;
  };

  const getElectionSettingsMutationErrorMessage = (err, action) => {
    const rawMessage = err?.message || "";
    const isRlsError =
      err?.code === "42501" ||
      /row-level security|permission denied/i.test(rawMessage);

    if (isRlsError) {
      return "Permission denied for election settings. Apply fix_election_settings_rls.sql in Supabase and confirm the account role is admin.";
    }

    return `Failed to ${action} election`;
  };

  const buildCandidateInsertPayload = (candidate) => ({
    name: candidate.name,
    party: candidate.party || null,
    bio: candidate.bio || null,
    manifesto: candidate.manifesto || null,
    position_id: candidate.position_id,
    user_id: candidate.user_id,
    status: candidate.status || "approved",
    vote_count: candidate.vote_count ?? 0,
    photo_url: candidate.photo_url || null
  });

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleAddPost = async () => {
    if (!post.trim()) {
      showSnackbar("Please enter announcement text", "warning");
      return;
    }

    const newPost = {
      id: Date.now(),
      text: post,
      timestamp: new Date().toLocaleString(),
      author: currentUser?.fullName || "Admin",
      priority: "medium",
      title: `Announcement ${posts.length + 1}`,
      type: "general"
    };

    try {
      if (!currentUser?.id) {
        showSnackbar("Cannot post announcement: missing admin user id", "error");
        return;
      }
      const payload = {
        content: newPost.text,
        author_id: currentUser.id,
        priority: newPost.priority,
        title: newPost.title
      };
      const { data, error } = await supabase
        .from('announcements')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      const mapped = {
        id: data.id,
        title: data.title,
        text: data.content,
        priority: data.priority,
        author: currentUser?.fullName || "Admin",
        timestamp: data.created_at
      };
      setPosts(prev => [mapped, ...prev]);
      setPost("");
      showSnackbar("Announcement posted successfully!");
    } catch (err) {
      console.error('Failed to post announcement', err);
      showSnackbar(getAnnouncementMutationErrorMessage(err, 'post'), "error");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      showSnackbar('Announcement deleted');
    } catch (err) {
      console.error('Error deleting post', err);
      showSnackbar(getAnnouncementMutationErrorMessage(err, 'delete'), 'error');
    }
  };

  const handleAddPosition = async () => {
    const name = (newPositionName || "").trim();
    if (!name) {
      showSnackbar('Please enter a position name', 'warning');
      return;
    }

    if (editPosition) {
      try {
        const { data, error } = await supabase
          .from('positions')
          .update({ name })
          .eq('id', editPosition.id)
          .select()
          .single();
        if (error) throw error;
        setPositions(prev => prev.map(p => p.id === editPosition.id ? data : p));
        setEditPosition(null);
        setNewPositionName('');
        showSnackbar('Position updated');
      } catch (err) {
        console.error('Failed to update position', err);
        showSnackbar(getPositionMutationErrorMessage(err, 'update'), 'error');
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('positions')
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      setPositions(prev => [...prev, data]);
      setNewPositionName('');
      setOpenPositionDialog(false);
      showSnackbar('Position added successfully');
    } catch (err) {
      console.error('Failed to add position', err);
      showSnackbar(getPositionMutationErrorMessage(err, 'add'), 'error');
    }
  };

  const handleDeletePosition = async (positionId) => {
    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', positionId);
      if (error) throw error;
      const updated = positions.filter(p => p.id !== positionId);
      setPositions(updated);
      showSnackbar('Position deleted');
    } catch (err) {
      console.error('Failed to delete position', err);
      showSnackbar(getPositionMutationErrorMessage(err, 'delete'), 'error');
    }
  };

  const handleEditCandidate = async () => {
    if (!editCandidate) return;

    try {
      const { data, error } = await supabase
        .from('candidates')
        .update(editCandidate)
        .eq('id', editCandidate.id)
        .select()
        .single();
      if (error) throw error;
      setCandidates(prev => prev.map(c => c.id === editCandidate.id ? data : c));
      setEditCandidate(null);
      showSnackbar("Candidate updated successfully!");
    } catch (err) {
      console.error('Failed to update candidate', err);
      showSnackbar(getCandidateMutationErrorMessage(err, 'update'), "error");
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);
      if (error) throw error;
      const updatedCandidates = candidates.filter(c => c.id !== candidateId);
      setCandidates(updatedCandidates);
      showSnackbar("Candidate deleted");
      calculateResults(updatedCandidates, votes);
    } catch (err) {
      console.error('Failed to delete candidate', err);
      showSnackbar(getCandidateMutationErrorMessage(err, 'delete'), "error");
    }
  };

  const handleToggleCandidateStatus = async (candidateId) => {
    const target = candidates.find(c => c.id === candidateId);
    if (!target) return;
    const nextStatus = target.status === "approved" ? "rejected" : "approved";
    try {
      const { data, error } = await supabase
        .from('candidates')
        .update({ status: nextStatus })
        .eq('id', candidateId)
        .select()
        .single();
      if (error) throw error;
      setCandidates(prev => prev.map(c => c.id === candidateId ? data : c));
      showSnackbar("Candidate status updated");
    } catch (err) {
      console.error('Failed to update candidate status', err);
      showSnackbar(getCandidateMutationErrorMessage(err, 'update'), "error");
    }
  };

  const handleApproveRequest = async (request) => {
    // Create candidate from approved request
    const newCandidate = {
      name: request.studentName,
      party: request.party,
      bio: request.bio,
      position_id: request.position_id,
      user_id: request.user_id,
      manifesto: request.manifesto,
      status: "approved",
      vote_count: 0
    };

    try {
      const { data: createdCandidate, error: candErr } = await supabase
        .from('candidates')
        .insert([buildCandidateInsertPayload(newCandidate)])
        .select()
        .single();
      if (candErr) throw candErr;

      const { data: updatedRequest, error: reqErr } = await supabase
        .from('candidate_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', request.id)
        .select()
        .single();
      if (reqErr) throw reqErr;

      setCandidates(prev => [createdCandidate, ...prev]);
      setCandidateRequests(prev => prev.map(r => r.id === request.id ? { ...r, ...updatedRequest } : r));

      setOpenRequestDetailDialog(false);
      setSelectedRequest(null);
      showSnackbar(`${request.studentName} approved as candidate!`);
    } catch (err) {
      console.error('Error approving request', err);
      showSnackbar(getCandidateMutationErrorMessage(err, 'approve'), 'error');
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const { data: updatedRequest, error } = await supabase
        .from('candidate_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', request.id)
        .select()
        .single();
      if (error) throw error;

      setCandidateRequests(prev => prev.map(r => r.id === request.id ? { ...r, ...updatedRequest } : r));

      setOpenRequestDetailDialog(false);
      setSelectedRequest(null);
      showSnackbar(`Request from ${request.studentName} rejected.`);
    } catch (err) {
      console.error('Error rejecting request', err);
      showSnackbar('Failed to reject candidate request', 'error');
    }
  };

  const handleApproveCollegeEventRequest = async (request) => {
    try {
      const updated = await collegeEventRequestsService.approve(request.id);
      setCollegeEventRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, ...updated } : r)));
      showSnackbar(`Approved winning candidate request from ${request.winnerName}.`);
    } catch (err) {
      console.error('Error approving college event request', err);
      showSnackbar('Failed to approve college event request', 'error');
    }
  };

  const handleRejectCollegeEventRequest = async (request) => {
    try {
      const updated = await collegeEventRequestsService.reject(request.id);
      setCollegeEventRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, ...updated } : r)));
      showSnackbar(`Rejected winning candidate request from ${request.winnerName}.`);
    } catch (err) {
      console.error('Error rejecting college event request', err);
      showSnackbar('Failed to reject college event request', 'error');
    }
  };

  const handleStartElection = async () => {
    if (!electionSettings.startTime || !electionSettings.endTime) {
      showSnackbar("Please set both start and end times", "warning");
      return;
    }

    const start = new Date(electionSettings.startTime);
    const end = new Date(electionSettings.endTime);
    const now = new Date();

    if (end <= start) {
      showSnackbar("End time must be after start time", "error");
      return;
    }

    if (end <= now) {
      showSnackbar("End time must be in the future", "error");
      return;
    }

    const updatedSettings = {
      ...electionSettings,
      isActive: true
    };

    try {
      // First create election on blockchain if enabled
      let blockchainResult = null;
      if (isBlockchainVoteEnabled()) {
        try {
          const startTimestamp = Math.floor(start.getTime() / 1000);
          const endTimestamp = Math.floor(end.getTime() / 1000);
          
          blockchainResult = await createElectionOnChain({
            name: electionSettings.title || 'TrustVote Election',
            startTime: startTimestamp,
            endTime: endTimestamp
          });
          
          showSnackbar(`Election created on blockchain! TX: ${blockchainResult.txHash}`, "success");
          
          // Update env with the new election ID if it was created
          if (blockchainResult.electionId !== null) {
            // Note: This would require updating the .env file, but that's not possible from client
            // The admin would need to manually update REACT_APP_BLOCKCHAIN_ELECTION_ID
            showSnackbar(`New election ID: ${blockchainResult.electionId}. Update REACT_APP_BLOCKCHAIN_ELECTION_ID in .env`, "info");
          }
        } catch (blockchainErr) {
          console.warn('Blockchain election creation failed:', blockchainErr);
          showSnackbar(`Blockchain creation failed: ${blockchainErr.message}. Continuing with database only.`, "warning");
        }
      }

      // Then update database
      const { data, error } = await supabase
        .from('election_settings')
        .upsert([mapSettingsToDb(updatedSettings)])
        .select()
        .single();
      if (error) throw error;
      
      setElectionSettings(mapSettingsFromDb(data));
      setOpenElectionDialog(false);
      showSnackbar("Election started successfully!");
    } catch (err) {
      console.error('Failed to start election', err);
      showSnackbar(getElectionSettingsMutationErrorMessage(err, 'start'), "error");
    }
  };

  const handleStopElection = async () => {
    const updatedSettings = {
      ...electionSettings,
      isActive: false
    };

    try {
      const { data, error } = await supabase
        .from('election_settings')
        .upsert([mapSettingsToDb(updatedSettings)])
        .select()
        .single();
      if (error) throw error;
      setElectionSettings(mapSettingsFromDb(data));
      showSnackbar("Election stopped successfully!");
      await assignChairmanRoleFromResults();
    } catch (err) {
      console.error('Failed to stop election', err);
      showSnackbar(getElectionSettingsMutationErrorMessage(err, 'stop'), "error");
    }
  };

  const assignChairmanRoleFromResults = async () => {
    try {
      const chairmanPosition = positions.find((p) =>
        String(p.name || '').toLowerCase().includes('chairman')
      );
      if (!chairmanPosition) {
        showSnackbar('No "Chairman" position found. Add a Chairman position to assign the role.', 'warning');
        return;
      }

      const [votesData, candidatesRes] = await Promise.all([
        votesService.getAllWithBlockchainAudit(),
        supabase
          .from('candidates')
          .select('id,user_id,position_id,name')
          .eq('position_id', chairmanPosition.id)
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      const chairmanCandidates = candidatesRes.data || [];
      const voteCounts = {};
      (votesData || []).forEach((vote) => {
        if (String(vote.position_id) !== String(chairmanPosition.id)) return;
        voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1;
      });

      const winner = chairmanCandidates.reduce((best, candidate) => {
        const count = voteCounts[candidate.id] || 0;
        if (!best || count > best.count) return { ...candidate, count };
        return best;
      }, null);

      if (!winner || winner.count === 0) {
        showSnackbar('No Chairman winner could be determined (no votes).', 'warning');
        return;
      }
      if (!winner.user_id) {
        showSnackbar('Chairman winner has no linked user account. Cannot assign role.', 'warning');
        return;
      }

      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'chairman', updated_at: new Date().toISOString() })
        .eq('id', winner.user_id);
      if (roleError) throw roleError;

      showSnackbar(`Chairman role assigned to ${winner.name || 'winner'}.`);
    } catch (err) {
      console.error('Failed to assign chairman role', err);
      showSnackbar('Failed to assign Chairman role automatically.', 'error');
    }
  };

  const getElectionStatus = () => {
    if (!electionSettings || !electionSettings.isActive) return "Not Started";

    try {
      const now = new Date();
      const start = new Date(electionSettings.startTime);
      const end = new Date(electionSettings.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Not Started";

      if (now < start) return "Scheduled";
      if (now >= start && now <= end) return "Active";
      if (now > end) return "Completed";
    } catch (err) {
      console.error('Invalid election date values', err, electionSettings);
      return "Not Started";
    }
  };

  const getTimeRemaining = () => {
    if (!electionSettings || !electionSettings.isActive) return null;

    try {
      const now = new Date();
      const end = new Date(electionSettings.endTime);
      if (isNaN(end.getTime())) return null;

      const diff = end - now;
      if (diff <= 0) return "Election ended";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
      return `${hours}h ${minutes}m remaining`;
    } catch (err) {
      console.error('Error computing time remaining', err, electionSettings);
      return null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddPost();
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toUnixSeconds = (value) => {
    if (!value) return '';
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return '';
    return Math.floor(ts / 1000);
  };

  const mapSettingsToDb = (settings) => {
    const payload = {
      title: settings.title,
      description: settings.description,
      start_date: settings.startTime || null,
      end_date: settings.endTime || null,
      is_active: !!settings.isActive
    };
    if (settings?.id) {
      payload.id = settings.id;
    }
    return payload;
  };

  const mapSettingsFromDb = (row) => ({
    ...electionSettings,
    ...row,
    startTime: row.start_date || '',
    endTime: row.end_date || '',
    isActive: !!row.is_active
  });

  const handleSaveSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('election_settings')
        .upsert([mapSettingsToDb(electionSettings)])
        .select()
        .single();
      if (error) throw error;
      setElectionSettings(mapSettingsFromDb(data));
      showSnackbar("Settings saved successfully!");
    } catch (err) {
      console.error('Failed to save settings', err);
      showSnackbar(getElectionSettingsMutationErrorMessage(err, 'save'), "error");
    }
  };

  const handleExportData = (type) => {
    let data, filename;
    
    switch (type) {
      case 'candidates':
        data = candidates;
        filename = `candidates-${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'votes':
        data = votes;
        filename = `votes-${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'results':
        data = results;
        filename = `results-${new Date().toISOString().split('T')[0]}.json`;
        break;
      default:
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    showSnackbar(`${type} exported successfully!`);
  };

  const getAvatarText = (name) => {
    if (!name || name.trim().length === 0) return "?";
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return name.substring(0, 2).toUpperCase();
    } else {
      return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
    }
  };

  const electionStatus = getElectionStatus();
  const timeRemaining = getTimeRemaining();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <AdminPanelSettings sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6">Loading Admin Dashboard...</Typography>
          <LinearProgress sx={{ mt: 2, width: 200, mx: 'auto' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="dashboard-shell" sx={{ 
      minHeight: '100vh', 
      p: { xs: 1, sm: 2, md: 3 }
    }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Paper 
          className="dashboard-surface"
          elevation={8} 
          sx={{ 
            maxWidth: 1600, 
            mx: 'auto', 
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.97)'
          }}
        >
        <Box className="dashboard-header" sx={{ 
          background: 'linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)',
          color: 'white',
          p: { xs: 2, sm: 3 }
        }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <IconButton 
                color="inherit" 
                onClick={() => setSidebarOpen(true)}
                sx={{ display: { md: 'none' } }}
              >
                <Menu />
              </IconButton>
            </Grid>
            <Grid item>
              <Avatar sx={{ 
                bgcolor: 'secondary.light', 
                width: { xs: 40, sm: 48, md: 56 }, 
                height: { xs: 40, sm: 48, md: 56 } 
              }}>
                <AdminPanelSettings />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
                Election Admin Dashboard
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                Welcome, {currentUser?.fullName || "Administrator"}
              </Typography>
              
              {electionSettings.isActive && (
                <Alert 
                  severity={
                    electionStatus === "Active" ? "success" : 
                    electionStatus === "Scheduled" ? "info" : "warning"
                  }
                  sx={{ 
                    mt: 1, 
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '& .MuiAlert-icon': { color: 'white' }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2 
                  }}>
                    <Typography variant="body2">
                      <strong>Election Status:</strong> {electionStatus} • 
                      {electionSettings.startTime && ` Starts: ${new Date(electionSettings.startTime).toLocaleString()} •`}
                      {electionSettings.endTime && ` Ends: ${new Date(electionSettings.endTime).toLocaleString()}`}
                      {timeRemaining && ` • ${timeRemaining}`}
                    </Typography>
                    {electionStatus === "Active" && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={handleStopElection}
                        startIcon={<Stop />}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'white',
                          '&:hover': { background: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        Stop Election
                      </Button>
                    )}
                  </Box>
                </Alert>
              )}
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`${posts.length} Announcements`}
                  icon={<Announcement />}
                  variant="outlined" 
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)'
                  }}
                />
                <Chip 
                  label={`${candidates.length} Candidates`}
                  icon={<People />}
                  variant="outlined" 
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)'
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 280,
                background: 'linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)',
                color: 'white'
              }
            }}
          >
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Admin Menu</Typography>
                <IconButton color="inherit" onClick={() => setSidebarOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <List>
                {['Dashboard', 'Candidates', 'Candidate Requests', 'Voters', 'Analytics', 'Settings', 'Winner Requests'].map((text, index) => (
                  <ListItem 
                    button 
                    key={text}
                    selected={activeTab === index}
                    onClick={() => {
                      setActiveTab(index);
                      setSidebarOpen(false);
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white' }}>
                      {index === 0 && <Dashboard />}
                      {index === 1 && <People />}
                      {index === 2 && <PersonAdd />}
                      {index === 3 && <HowToVote />}
                      {index === 4 && <Analytics />}
                      {index === 5 && <Settings />}
                      {index === 6 && <Schedule />}
                    </ListItemIcon>
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>

          <Box sx={{ 
            display: { xs: 'none', md: 'block' },
            width: 280,
            background: 'linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)',
            color: 'white',
            minHeight: 'calc(100vh - 120px)'
          }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AdminPanelSettings sx={{ mr: 1 }} />
                Admin Menu
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <List>
                {['Dashboard', 'Candidates', 'Candidate Requests', 'Voters', 'Analytics', 'Settings', 'Winner Requests'].map((text, index) => (
                  <ListItem 
                    button 
                    key={text}
                    selected={activeTab === index}
                    onClick={() => setActiveTab(index)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      '&.Mui-selected': {
                        background: 'rgba(255,255,255,0.15)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white' }}>
                      {index === 0 && <Dashboard />}
                      {index === 1 && <People />}
                      {index === 2 && <PersonAdd />}
                      {index === 3 && <HowToVote />}
                      {index === 4 && <Analytics />}
                      {index === 5 && <Settings />}
                      {index === 6 && <Schedule />}
                    </ListItemIcon>
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Box className="dashboard-tabbar" sx={{ 
              display: { xs: 'block', md: 'none' },
              borderBottom: 1, 
              borderColor: 'divider' 
            }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<Dashboard />} label="Dashboard" />
                <Tab icon={<People />} label="Candidates" />
                <Tab icon={<PersonAdd />} label="Requests" />
                <Tab icon={<HowToVote />} label="Voters" />
                <Tab icon={<Analytics />} label="Analytics" />
                <Tab icon={<Settings />} label="Settings" />
                <Tab icon={<Schedule />} label="Winner Requests" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card className="dashboard-kpi" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: 'primary.light', 
                        width: 60, 
                        height: 60, 
                        mx: 'auto', 
                        mb: 2 
                      }}>
                        <People />
                      </Avatar>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {voters.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Voters
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card className="dashboard-kpi" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: 'secondary.light', 
                        width: 60, 
                        height: 60, 
                        mx: 'auto', 
                        mb: 2 
                      }}>
                        <HowToVote />
                      </Avatar>
                      <Typography variant="h4" fontWeight="bold" color="secondary">
                        {analytics.voted}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Votes Cast
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card className="dashboard-kpi" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: 'success.light', 
                        width: 60, 
                        height: 60, 
                        mx: 'auto', 
                        mb: 2 
                      }}>
                        <PersonAdd />
                      </Avatar>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {candidates.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Candidates
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card className="dashboard-kpi" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: 'warning.light', 
                        width: 60, 
                        height: 60, 
                        mx: 'auto', 
                        mb: 2 
                      }}>
                        <Announcement />
                      </Avatar>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {posts.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Announcements
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={8}>
                  <Paper className="dashboard-content-card" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      <Announcement sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Latest Announcements
                    </Typography>
                    
                    <TextField
                      label="Create new announcement..."
                      value={post}
                      onChange={(e) => setPost(e.target.value)}
                      onKeyPress={handleKeyPress}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Press Enter to post
                      </Typography>
                      <Button 
                        variant="contained" 
                        onClick={handleAddPost}
                        disabled={!post.trim()}
                        startIcon={<Add />}
                      >
                        Post
                      </Button>
                    </Box>

                    <Box sx={{ mt: 3, maxHeight: 300, overflow: 'auto' }}>
                      {posts.length === 0 ? (
                        <Typography color="text.secondary" align="center" py={3}>
                          No announcements yet
                        </Typography>
                      ) : (
                        posts.map((p) => (
                          <Card key={p.id} sx={{ mb: 2, p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {p.author}
                              </Typography>
                              <IconButton size="small" onClick={() => handleDeletePost(p.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography variant="body2">{p.text}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.timestamp}
                            </Typography>
                          </Card>
                        ))
                      )}
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Election Control
                    </Typography>
                    
                    <Alert severity={electionSettings.isActive ? "success" : "info"} sx={{ mb: 2 }}>
                      Status: <strong>{electionStatus}</strong>
                      {timeRemaining && ` • ${timeRemaining}`}
                    </Alert>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={electionSettings.isActive ? <Stop /> : <PlayArrow />}
                      onClick={electionSettings.isActive ? handleStopElection : () => setOpenElectionDialog(true)}
                      color={electionSettings.isActive ? "error" : "success"}
                      sx={{ mb: 2 }}
                    >
                      {electionSettings.isActive ? 'Stop Election' : 'Start Election'}
                    </Button>
                    
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/results')}
                      startIcon={<Analytics />}
                    >
                      View Results
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  <People sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Manage Candidates ({candidates.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => handleExportData('candidates')}
                  >
                    Export
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {positions.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">No positions defined</Typography>
                  ) : (
                    positions.map(p => (
                      <Chip key={p.id} label={p.name} size="small" />
                    ))
                  )}
                </Box>
                <Box>
                  <Button variant="outlined" size="small" onClick={() => setOpenPositionDialog(true)} startIcon={<Settings />}>Manage Positions</Button>
                </Box>
              </Box>

              {candidates.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                  <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No candidates added yet
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Candidates must be added via student requests. Review and approve candidate requests below.
                  </Alert>
                </Paper>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                          <TableCell>Candidate</TableCell>
                          <TableCell>Party</TableCell>
                          <TableCell>Position</TableCell>
                          <TableCell>{electionSettings.isActive ? 'Status' : 'Votes'}</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidates
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((candidate) => (
                          <TableRow key={candidate.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: candidate.avatarColor }}>
                                  {getAvatarText(candidate.name)}
                                </Avatar>
                                <Box>
                                  <Typography fontWeight="bold">{candidate.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {candidate.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={candidate.party} size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography>
                                {positions.find(p => p.id === candidate.position_id)?.name || 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {!electionSettings.isActive ? (
                                <Typography fontWeight="bold">
                                  {candidate.votes || 0}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Hidden
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={candidate.status || 'approved'}
                                color={candidate.status === 'approved' ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Edit">
                                  <IconButton 
                                    size="small"
                                    onClick={() => setEditCandidate(candidate)}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton 
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteCandidate(candidate.id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={candidates.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </TableContainer>
              )}

              <Dialog
                open={openPositionDialog}
                onClose={() => { setOpenPositionDialog(false); setEditPosition(null); setNewPositionName(''); }}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>
                  <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Manage Positions
                </DialogTitle>
                <DialogContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label={editPosition ? 'Edit Position' : 'New Position'}
                      fullWidth
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleAddPosition}>{editPosition ? 'Update' : 'Add'}</Button>
                  </Box>

                  <Box>
                    {positions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No positions yet. Add one above.</Typography>
                    ) : (
                      positions.map(p => (
                        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1, borderRadius: 1, background: 'rgba(0,0,0,0.02)' }}>
                          <Typography>{p.name}</Typography>
                          <Box>
                            <Button size="small" onClick={() => { setEditPosition(p); setNewPositionName(p.name); }}>Edit</Button>
                            <Button size="small" color="error" onClick={() => handleDeletePosition(p.id)}>Delete</Button>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setOpenPositionDialog(false); setNewPositionName(''); setEditPosition(null); }}>Close</Button>
                </DialogActions>
              </Dialog>
            </TabPanel>

            {/* Candidate Requests Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  <PersonAdd sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Candidate Requests ({candidateRequests.filter(r => r.status === 'pending').length})
                </Typography>
              </Box>

              {candidateRequests.length === 0 ? (
                <Alert severity="info">No candidate requests yet.</Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {candidateRequests.filter(r => r.status === 'pending').map((request) => (
                    <Card key={request.id} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar>
                              {getAvatarText(request.studentName)}
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {request.studentName}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {request.studentDepartment}
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Chip
                              label={positions.find(p => p.id === request.position_id)?.name || 'Position'}
                              size="small"
                              color="primary"
                            />
                          </Box>
                        </Box>

                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Party:</strong> {request.party}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Email:</strong> {request.studentEmail}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>Phone:</strong> {request.phone}
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 2, color: 'textSecondary' }}>
                          <strong>Bio:</strong> {request.bio.substring(0, 100)}...
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setSelectedRequest(request);
                              setOpenRequestDetailDialog(true);
                            }}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleRejectRequest(request)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {candidateRequests.some(r => r.status === 'approved' || r.status === 'rejected') && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Processed Requests
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {candidateRequests.filter(r => r.status !== 'pending').map((request) => (
                      <Card key={request.id} sx={{ borderRadius: 3, opacity: 0.7 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {request.studentName}
                              </Typography>
                              <Chip
                                label={request.status === 'approved' ? 'Approved' : 'Rejected'}
                                size="small"
                                color={request.status === 'approved' ? 'success' : 'error'}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {request.processedAt ? new Date(request.processedAt).toLocaleDateString() : '-'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  <HowToVote sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Voter Management ({voters.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExportData('votes')}
                >
                  Export Votes
                </Button>
              </Box>

              <Paper>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Registration</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Voting Status</TableCell>
                        <TableCell>Voted For</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {voters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No voters registered yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        voters
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((voter) => {
                            const studentVotes = votes.filter(v => v.student_id === voter.id);
                            const hasVoted = studentVotes.length > 0;
                            const firstVote = studentVotes[0];
                            const firstCandidateName = firstVote
                              ? candidates.find(c => c.id === firstVote.candidate_id)?.name
                              : null;
                            const voteLabel = studentVotes.length > 1
                              ? "Multiple"
                              : (firstCandidateName || "Voted");
                            
                            return (
                              <TableRow key={voter.email}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar>
                                      {getAvatarText(voter.fullName)}
                                    </Avatar>
                                    <Box>
                                      <Typography fontWeight="bold">{voter.fullName}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {voter.email}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>{voter.registrationNumber}</TableCell>
                                <TableCell>{voter.department}</TableCell>
                                <TableCell>{voter.year}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={hasVoted ? "Voted" : "Not Voted"}
                                    color={hasVoted ? "success" : "default"}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {hasVoted ? (
                                    <Chip 
                                      label={voteLabel}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      Not voted
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={voters.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Election Analytics
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadDashboardData}
                >
                  Refresh Analytics
                </Button>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {analytics.turnout}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Voter Turnout
                        </Typography>
                      </Box>
                      <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(analytics.turnout)} 
                      sx={{ mt: 2 }}
                    />
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {analytics.voted}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Voted
                        </Typography>
                      </Box>
                      <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {analytics.notVoted}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Not Voted
                        </Typography>
                      </Box>
                      <Warning sx={{ fontSize: 40, color: 'warning.main' }} />
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {blockchainCoverage.coverage}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Blockchain Coverage
                        </Typography>
                      </Box>
                      <Security sx={{ fontSize: 40, color: 'secondary.main' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {blockchainCoverage.auditedVotes} verified / {analytics.totalVotes} total
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Position-wise Vote Analytics
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Position</TableCell>
                            <TableCell>Total Votes</TableCell>
                            <TableCell>Unique Voters</TableCell>
                            <TableCell>Leading Candidate</TableCell>
                            <TableCell>Lead Votes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getPositionAnalytics().map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.totalVotes}</TableCell>
                              <TableCell>{row.uniqueVoters}</TableCell>
                              <TableCell>{row.leadingCandidate}</TableCell>
                              <TableCell>{row.leadingVotes}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Detailed Results
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Candidate</TableCell>
                            <TableCell>Party</TableCell>
                            <TableCell>Votes</TableCell>
                            <TableCell>Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {results.map((candidate, index) => (
                            <TableRow key={candidate.id}>
                              <TableCell>
                                <Chip 
                                  label={`#${index + 1}`}
                                  color={index === 0 ? "success" : "default"}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: candidate.avatarColor }}>
                                    {getAvatarText(candidate.name)}
                                  </Avatar>
                                  <Typography>{candidate.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip label={candidate.party} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography fontWeight="bold">
                                  {candidate.votes}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Typography>{candidate.percentage}%</Typography>
                                  <Box sx={{ flexGrow: 1 }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={parseFloat(candidate.percentage)} 
                                      sx={{ width: '100%' }}
                                    />
                                  </Box>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={activeTab} index={5}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                Election Settings
              </Typography>

              <Card sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Election Title"
                      fullWidth
                      value={electionSettings.title}
                      onChange={(e) => setElectionSettings({
                        ...electionSettings,
                        title: e.target.value
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Election Description"
                      multiline
                      rows={3}
                      fullWidth
                      value={electionSettings.description}
                      onChange={(e) => setElectionSettings({
                        ...electionSettings,
                        description: e.target.value
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Start Time"
                      type="datetime-local"
                      fullWidth
                      value={electionSettings.startTime}
                      onChange={(e) => setElectionSettings({
                        ...electionSettings,
                        startTime: e.target.value
                      })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="End Time"
                      type="datetime-local"
                      fullWidth
                      value={electionSettings.endTime}
                      onChange={(e) => setElectionSettings({
                        ...electionSettings,
                        endTime: e.target.value
                      })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleSaveSettings}
                      >
                        Save Settings
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setOpenElectionDialog(true)}
                      >
                        Configure Election Timing
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </TabPanel>

            <TabPanel value={activeTab} index={6}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Winning Candidate Requests ({collegeEventRequests.filter((r) => r.status === 'pending').length})
                </Typography>
                <Button variant="outlined" startIcon={<Refresh />} onClick={loadDashboardData}>
                  Refresh
                </Button>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Approve here to grant the winning candidate access to handle the requested college event.
              </Alert>

              {collegeEventRequests.length === 0 ? (
                <Alert severity="info">No college event handling requests yet.</Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {collegeEventRequests.filter((r) => r.status === 'pending').map((request) => (
                    <Card key={request.id} sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {request.event_title}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Winner:</strong> {request.winnerName}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Email:</strong> {request.winnerEmail || '-'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Party:</strong> {request.candidateParty || '-'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Proposed Date:</strong> {request.proposed_date ? new Date(request.proposed_date).toLocaleString() : '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {request.event_description || 'No event description provided.'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleApproveCollegeEventRequest(request)}
                          >
                            Approve Access
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleRejectCollegeEventRequest(request)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {collegeEventRequests.some((r) => r.status !== 'pending') && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Processed Winner Requests
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Winner</TableCell>
                          <TableCell>Event</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Proposed Date</TableCell>
                          <TableCell>Processed On</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {collegeEventRequests
                          .filter((r) => r.status !== 'pending')
                          .map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>{request.winnerName}</TableCell>
                              <TableCell>{request.event_title}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={request.status}
                                  color={request.status === 'approved' ? 'success' : 'error'}
                                />
                              </TableCell>
                              <TableCell>{request.proposed_date ? new Date(request.proposed_date).toLocaleDateString() : '-'}</TableCell>
                              <TableCell>{request.processedAt ? new Date(request.processedAt).toLocaleDateString() : '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </TabPanel>
          </Box>
        </Box>

        <Dialog 
          open={openElectionDialog} 
          onClose={() => setOpenElectionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
            Configure Election Timing
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Election Start Time"
                  type="datetime-local"
                  fullWidth
                  value={electionSettings.startTime}
                  onChange={(e) => setElectionSettings({
                    ...electionSettings,
                    startTime: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Election End Time"
                  type="datetime-local"
                  fullWidth
                  value={electionSettings.endTime}
                  onChange={(e) => setElectionSettings({
                    ...electionSettings,
                    endTime: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            {electionSettings.startTime && electionSettings.endTime && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Election will run from {new Date(electionSettings.startTime).toLocaleString()} 
                to {new Date(electionSettings.endTime).toLocaleString()}
              </Alert>
            )}

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Remix helper (Unix time in seconds)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Start (Unix seconds)"
                    fullWidth
                    value={toUnixSeconds(electionSettings.startTime)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="End (Unix seconds)"
                    fullWidth
                    value={toUnixSeconds(electionSettings.endTime)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Use these values in Remix `createElection(name, startTime, endTime)`.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenElectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleStartElection}
              disabled={!electionSettings.startTime || !electionSettings.endTime}
              startIcon={<CheckCircle />}
            >
              Start Election
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ 
          p: 3, 
          borderTop: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                (c) 2024 Campus Council Admin Panel
              </Typography>
            </Grid>
            <Grid item>
              <Button 
                color="error" 
                variant="outlined" 
                onClick={logout}
                startIcon={<Logout />}
              >
                Logout
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Candidate Request Detail Dialog */}
        <Dialog open={openRequestDetailDialog} onClose={() => setOpenRequestDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.3rem' }}>
          Candidate Request Details
        </DialogTitle>
        {selectedRequest && (
          <DialogContent sx={{ py: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {selectedRequest.studentName}
              </Typography>
              <Chip
                label={positions.find(p => p.id === selectedRequest.position_id)?.name || 'Position'}
                color="primary"
                sx={{ mr: 1 }}
              />
              <Chip label={selectedRequest.party} variant="outlined" />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Email:</strong> {selectedRequest.studentEmail}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Phone:</strong> {selectedRequest.phone}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Department:</strong> {selectedRequest.studentDepartment}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Request Date:</strong> {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : '-'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Bio:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
              {selectedRequest.bio}
            </Typography>

            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Manifesto:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
              {selectedRequest.manifesto}
            </Typography>

            {selectedRequest.status !== 'pending' && (
              <Alert severity={selectedRequest.status === 'approved' ? 'success' : 'error'} sx={{ mt: 2 }}>
                <strong>Status:</strong> {selectedRequest.status === 'approved' ? 'Approved and added as candidate' : 'Rejected'}
                <br />
                <strong>Processed:</strong> {selectedRequest.processedAt ? new Date(selectedRequest.processedAt).toLocaleDateString() : '-'}
              </Alert>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRequestDetailDialog(false)}>Close</Button>
          {selectedRequest && selectedRequest.status === 'pending' && (
            <>
              <Button
                onClick={() => handleRejectRequest(selectedRequest)}
                color="error"
                variant="outlined"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApproveRequest(selectedRequest)}
                color="success"
                variant="contained"
              >
                Approve & Add as Candidate
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
        </Paper>
      </Box>
    </Box>
  );
}

