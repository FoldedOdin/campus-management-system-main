// src/pages/StudentDashboard.js
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Zoom
} from "@mui/material";
import {
  AccessTime,
  Announcement,
  CalendarToday,
  Chat,
  CheckCircle,
  Close,
  History,
  HowToVote,
  Info,
  Notifications,
  People,
  Person,
  Poll,
  Print,
  Schedule,
  Security,
  Send,
  Share,
  SmartToy,
  TrendingUp,
  VerifiedUser,
  Warning,
  Logout
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  announcementsService,
  candidatesService,
  candidateRequestsService,
  electionSettingsService,
  positionsService,
  votesService
} from "../lib/supabaseService";
import { commitVoteOnChain, isBlockchainVoteEnabled } from "../lib/blockchainService";
import DashboardBackdrop from "../components/DashboardBackdrop";

const TabPanel = ({ children, value, index, ...other }) => (
  <div hidden={value !== index} {...other}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export default function StudentDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [voted, setVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [electionSettings, setElectionSettings] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [studentVotes, setStudentVotes] = useState({});
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastBlockchainVote, setLastBlockchainVote] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [openCandidateRequestDialog, setOpenCandidateRequestDialog] = useState(false);
  const [candidateRequest, setCandidateRequest] = useState({
    position: "",
    bio: "",
    party: "",
    manifesto: "",
    email: currentUser?.email || "",
    phone: ""
  });
  const [requestStatus, setRequestStatus] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatOpen || showConfirmDialog || openCandidateRequestDialog) {
      const active = document.activeElement;
      if (active && active instanceof HTMLElement) {
        active.blur();
      }
    }
  }, [chatOpen, showConfirmDialog, openCandidateRequestDialog]);


  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const announcementsList = await announcementsService.getAll();
        setAnnouncements(announcementsList || []);

        const activeElection = await electionSettingsService.getActive();
        setElectionSettings(activeElection);

        const positionsList = await positionsService.getAll();
        setPositions(positionsList || []);

        const candidatesList = await candidatesService.getAll();
        setCandidates(candidatesList || []);

        if (currentUser?.id) {
          const studentVotesList = await votesService.getByStudentWithBlockchainAudit(currentUser.id);
          const votesMap = {};
          (studentVotesList || []).forEach((vote) => {
            votesMap[String(vote.position_id)] = vote;
          });
          setStudentVotes(votesMap);

          const votedCount = Object.keys(votesMap).length;
          const totalPositions = (positionsList || []).length;
          const hasCompletedAllVotes = totalPositions > 0 && votedCount >= totalPositions;
          setVoted(hasCompletedAllVotes);
        }

        setMessages([
          {
            id: 1,
            text: `Hello ${currentUser?.fullName?.split(" ")[0] || "Student"}! ?? I'm your Campus Council assistant. I can help you with:\n\n� Voting procedures\n� Candidate information\n� Election schedule\n� Platform guidance\n� Results information\n\nWhat would you like to know?`,
            sender: "bot",
            timestamp: new Date()
          }
        ]);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        showSnackbar("Error loading dashboard data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "announcements") {
      setActiveTab(2);
    }

    // Also support /student/announcements route
    if (location.pathname.endsWith("/announcements")) {
      setActiveTab(2);
    }

    if (!currentUser) return;

    const reloadAnnouncements = async () => {
      try {
        const announcementsList = await announcementsService.getAll();
        setAnnouncements(announcementsList || []);
      } catch (err) {
        console.error("Failed to reload announcements", err);
      }
    };

    const reloadPositions = async () => {
      try {
        const positionsList = await positionsService.getAll();
        setPositions(positionsList || []);
      } catch (err) {
        console.error("Failed to reload positions", err);
      }
    };

    const reloadCandidates = async () => {
      try {
        const candidatesList = await candidatesService.getAll();
        setCandidates(candidatesList || []);
      } catch (err) {
        console.error("Failed to reload candidates", err);
      }
    };

    const reloadElectionSettings = async () => {
      try {
        const activeElection = await electionSettingsService.getActive();
        setElectionSettings(activeElection);
      } catch (err) {
        console.error("Failed to reload election settings", err);
      }
    };

    const channel = supabase
      .channel("student-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, reloadAnnouncements)
      .on("postgres_changes", { event: "*", schema: "public", table: "positions" }, reloadPositions)
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, reloadCandidates)
      .on("postgres_changes", { event: "*", schema: "public", table: "election_settings" }, reloadElectionSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, location.search]);

  const handleCandidateRequest = async () => {
    if (!candidateRequest.position.trim()) {
      showSnackbar("Please select a position", "warning");
      return;
    }
    if (!candidateRequest.bio.trim()) {
      showSnackbar("Please enter your bio", "warning");
      return;
    }

    try {
      const pendingRequests = await candidateRequestsService.getPending();
      const hasPending = pendingRequests.some(
        (r) =>
          r.user_id === currentUser?.id &&
          r.position_id === candidateRequest.position &&
          r.status === "pending"
      );

      if (hasPending) {
        showSnackbar("You already have a pending candidate request for this position", "warning");
        return;
      }

      const request = {
        position_id: candidateRequest.position,
        user_id: currentUser?.id,
        bio: candidateRequest.bio,
        party: candidateRequest.party,
        manifesto: candidateRequest.manifesto,
        email: candidateRequest.email,
        phone: candidateRequest.phone,
        status: "pending"
      };

      await candidateRequestsService.create(request);

      setOpenCandidateRequestDialog(false);
      setCandidateRequest({
        position: "",
        bio: "",
        party: "",
        manifesto: "",
        email: currentUser?.email || "",
        phone: ""
      });
      showSnackbar("Candidate request submitted! Admin will review it soon.");
      setRequestStatus("submitted");
    } catch (err) {
      console.error("Error submitting candidate request", err);
      showSnackbar("Error submitting request", "error");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const extractImageUrlFromText = (text) => {
    if (!text) return null;
    // Extract markdown images: ![alt](url)
    const markdownMatch = text.match(/!\[[^\]]*\]\(([^)\s]+)\)/i);
    if (markdownMatch) return markdownMatch[1];

    // Extract data URI images (e.g., data:image/png;base64,...)
    const dataUrlMatch = text.match(/(data:image\/[a-zA-Z]+;base64,[^\s]+)/i);
    if (dataUrlMatch) return dataUrlMatch[1];

    // Extract plain URLs and ensure they are images by extension.
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (!urlMatch) return null;
    const url = urlMatch[1];
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return url;
    return null;
  };

  const openAnnouncementDialog = (announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getAvatarText = (name) => {
    if (!name || name.trim().length === 0) return "?";
    const words = name.trim().split(" ").filter((word) => word.length > 0);
    if (words.length === 1) {
      return name.substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");

    setTimeout(() => {
      generateBotResponse(newMessage);
    }, 800);
  };

  const generateBotResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    let response = "";

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      response = "Hello! How can I assist you with the election today?";
    } else if (lowerMessage.includes("vote") || lowerMessage.includes("voting")) {
      response = getVotingInfoResponse();
    } else if (lowerMessage.includes("candidate") || lowerMessage.includes("candidates")) {
      response = getCandidatesInfoResponse();
    } else if (lowerMessage.includes("time") || lowerMessage.includes("schedule") || lowerMessage.includes("when")) {
      response = getElectionTimeResponse();
    } else if (lowerMessage.includes("result") || lowerMessage.includes("results")) {
      response =
        "Election results will be announced after the voting period ends. You can check the results on the Results tab once they're available.";
    } else if (lowerMessage.includes("help")) {
      response =
        "I can help you with:\n\n1. **Voting Procedures**: How to vote, eligibility\n2. **Candidate Info**: Profiles and manifestos\n3. **Election Schedule**: Timings and deadlines\n4. **Platform Guide**: How to use Campus Council\n5. **Results**: How and when results are announced\n\nWhat specific help do you need?";
    } else if (lowerMessage.includes("thank")) {
      response = "You're welcome! Is there anything else I can help you with?";
    } else if (lowerMessage.includes("profile") || lowerMessage.includes("account")) {
      response = `Your profile information:\n\n� Name: ${currentUser?.fullName || "Not set"}\n� Email: ${currentUser?.email || "Not set"}\n� Registration: ${currentUser?.registrationNumber || "Not set"}\n� Department: ${currentUser?.department || "Not set"}\n� Year: ${currentUser?.year || "Not set"}`;
    } else if (lowerMessage.includes("announcement")) {
      response = `There are ${announcements.length} announcements. Latest: "${announcements[0]?.text || "No announcements yet"}"`;
    } else {
      response =
        "I'm here to help with election-related questions. You can ask me about:\n\n� How to vote\n� Candidate information\n� Election timing\n� Platform features\n� Results and announcements\n\nWhat would you like to know?";
    }

    const botMessage = {
      id: Date.now() + 1,
      text: response,
      sender: "bot",
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  const getVotingInfoResponse = () => {
    const status = getElectionStatus();
    if (status === "active" && !voted) {
      return "? **The election is currently ACTIVE!**\n\n?? **How to vote:**\n1. Go to the 'Voting' tab\n2. Select your preferred candidate\n3. Review your choice\n4. Confirm your vote\n\n?? **Important:**\n� You can only vote ONCE\n� Your choice is FINAL\n� Vote before the deadline";
    }
    if (status === "active" && voted) {
      return `? **You have already voted!**\n\nYour vote for **${selectedCandidate?.name}** has been recorded successfully. Thank you for participating in the election! ???`;
    }
    if (status === "scheduled") {
      return `? **Election Scheduled**\n\nThe election will start on **${
        electionSettings?.startTime ? new Date(electionSettings.startTime).toLocaleString() : "a future date"
      }**.\n\nPlease check back then to cast your vote.`;
    }
    if (status === "ended") {
      return "? **Election Completed**\n\nThe election has ended. Thank you for your participation! Results will be announced soon.";
    }
    return "?? **Election Not Started**\n\nThe election has not been scheduled yet. Please wait for the admin to configure the voting period.";
  };

  const getCandidatesInfoResponse = () => {
    if (candidates.length === 0) {
      return "No candidates have been added to the election yet. Please check back later when candidates are announced.";
    }
    const candidateList = candidates
      .map((c, i) => {
        const votesInfo = electionStatus === "ended" ? ` - ${c.vote_count || 0} votes` : "";
        return `${i + 1}. **${c.name}** (${c.party})${votesInfo}`;
      })
      .join("\n");
    const votesNote =
      electionStatus === "ended" ? "" : "\n\n*Note: Vote counts are hidden during the election and will be shown after it ends.*";
    return `?? **Candidates Information**\n\nThere are ${candidates.length} candidates:\n\n${candidateList}${votesNote}\n\nYou can view their detailed profiles and manifestos in the 'Candidates' section.`;
  };

  const getElectionTimeResponse = () => {
    if (!electionSettings) {
      return "The election schedule hasn't been set yet. Please wait for the admin to configure the voting period.";
    }

    const startTime = new Date(electionSettings.startTime).toLocaleString();
    const endTime = new Date(electionSettings.endTime).toLocaleString();
    const status = getElectionStatus();

    if (status === "active") {
      return `? **Election Timeline**\n\n**Started:** ${startTime}\n**Ends:** ${endTime}\n**Status:** ACTIVE ??\n**Time Remaining:** ${
        getTimeRemaining() || "Calculating..."
      }\n\n?? **Hurry!** Voting will close soon.`;
    }
    if (status === "scheduled") {
      return `?? **Upcoming Election**\n\n**Starts:** ${startTime}\n**Ends:** ${endTime}\n**Status:** SCHEDULED ?\n\nGet ready to vote!`;
    }
    if (status === "ended") {
      return `? **Election Completed**\n\n**Period:** ${startTime} to ${endTime}\n**Status:** ENDED ?\n\nResults will be announced shortly.`;
    }
    return `?? **Election Schedule**\n\n**Period:** ${startTime} to ${endTime}`;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoteClick = (candidate) => {
    if (!positions || positions.length === 0) {
      if (!canVote) {
        showSnackbar("You cannot vote at this time", "warning");
        return;
      }
      setSelectedCandidate(candidate);
      setShowConfirmDialog(true);
      return;
    }
    const posId = String(candidate?.position_id || candidate?.position?.id || "");
    const hasVotedForPos = !!studentVotes[posId];
    if (electionStatus !== "active") {
      showSnackbar("You cannot vote at this time", "warning");
      return;
    }
    if (hasVotedForPos) {
      showSnackbar("You have already voted for this position", "info");
      return;
    }
    setSelectedCandidate(candidate);
    setSelectedPosition(posId);
    setShowConfirmDialog(true);
  };

  const handleConfirmVote = async () => {
    setShowConfirmDialog(false);

    try {
      if (!currentUser?.id || !selectedCandidate?.id) {
        showSnackbar("Unable to process vote: Missing user or candidate information", "error");
        return;
      }

      const positionId = selectedCandidate?.position_id || selectedCandidate?.position?.id;
      if (!positionId) {
        showSnackbar("Unable to process vote: Candidate position is missing", "error");
        return;
      }

      const hasVoted = await votesService.hasVoted(currentUser.id, positionId);
      if (hasVoted) {
        showSnackbar("You have already voted for this position", "warning");
        return;
      }

      let blockchainVote = null;
      let txInfo = "";

      // Try blockchain voting if enabled, but don't fail if it doesn't work
      if (isBlockchainVoteEnabled()) {
        try {
          showSnackbar("Connecting to blockchain for secure voting...", "info");
          blockchainVote = await commitVoteOnChain({
            voterId: currentUser.id,
            candidateId: selectedCandidate.id,
            positionId
          });
          setLastBlockchainVote(blockchainVote);
          txInfo = blockchainVote?.txHash ? ` Blockchain Tx: ${blockchainVote.txHash.slice(0, 14)}...` : " (Blockchain recorded)";
          showSnackbar("Blockchain vote recorded successfully!", "success");
        } catch (blockchainErr) {
          console.warn("Blockchain voting failed, continuing with database only:", blockchainErr);
          showSnackbar("Blockchain voting failed, but your vote will still be recorded in the database.", "warning");
          txInfo = " (Database only - blockchain failed)";
        }
      } else {
        txInfo = " (Database only)";
      }

      // Always save to database
      await votesService.cast(currentUser.id, selectedCandidate.id, positionId, blockchainVote);

      const updatedCandidates = candidates.map((c) =>
        c.id === selectedCandidate.id ? { ...c, vote_count: (c.vote_count || 0) + 1 } : c
      );
      setCandidates(updatedCandidates);

      const updatedVotes = { ...studentVotes, [String(positionId)]: selectedCandidate };
      setStudentVotes(updatedVotes);

      // Check if user has voted for all positions
      const totalPositions = positions.length;
      const votedCount = Object.keys(updatedVotes).length;
      if (votedCount >= totalPositions) {
        setVoted(true);
      }

      const posName = positions.find((p) => String(p.id) === String(positionId))?.name || "this position";
      showSnackbar(`Successfully voted for ${selectedCandidate.name} in ${posName}. You have voted for ${votedCount} out of ${totalPositions} positions.${txInfo}`, "success");
    } catch (err) {
      console.error("Error confirming vote", err);
      const message = err?.message || "Error recording your vote. Please try again.";
      showSnackbar(message, "error");
    }
  };

  const getElectionStatus = () => {
    if (!electionSettings) return "not_started";

    try {
      const now = new Date();
      const start = new Date(electionSettings.startTime);
      const end = new Date(electionSettings.endTime);

      const hasValidStart = !isNaN(start.getTime());
      const hasValidEnd = !isNaN(end.getTime());

      if (electionSettings.isActive) {
        if (hasValidEnd && now > end) return "ended";
        return "active";
      }

      if (hasValidStart && now < start) return "scheduled";
      if (hasValidEnd && now > end) return "ended";
      return "not_started";
    } catch (err) {
      console.error("Invalid election date values", err, electionSettings);
      return "not_started";
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

      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch (err) {
      console.error("Error computing time remaining", err, electionSettings);
      return null;
    }
  };

  const electionStatus = getElectionStatus();
  const timeRemaining = getTimeRemaining();
  const canVote = electionStatus === "active" && !voted && candidates.length > 0;
  const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
  const quickActionButtonSx = {
    color: "#333",
    borderColor: "#333",
    minHeight: 44,
    "&:hover": { background: "rgba(51,51,51,0.1)" }
  };

  const studentProfile = currentUser || {};
  const featuredAnnouncement = announcements?.[0];
  const featuredImageUrl = extractImageUrlFromText(featuredAnnouncement?.text);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Box sx={{ textAlign: "center" }}>
          <HowToVote sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
          <Typography variant="h6">Loading your dashboard...</Typography>
          <LinearProgress sx={{ mt: 2, width: 200, mx: "auto" }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      className="dashboard-shell"
      sx={{
        minHeight: "100vh",
        p: { xs: 1, sm: 2, md: 3 },
        position: "relative"
      }}
    >
      <DashboardBackdrop />
      <Box sx={{ position: "relative", zIndex: 2 }}>
        <Paper
          className="dashboard-surface"
          elevation={8}
          sx={{
            maxWidth: 1400,
            mx: "auto",
            borderRadius: { xs: 2, sm: 3, md: 4 },
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.97)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Box
            className="dashboard-header"
            sx={{
              background: "linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)",
              color: "#fff",
              p: { xs: 2, sm: 3 }
            }}
          >
            <Grid container alignItems="center" spacing={2}>
              <Grid item>
                <Avatar
                  sx={{
                    bgcolor: "primary.light",
                    width: { xs: 40, sm: 48, md: 56 },
                    height: { xs: 40, sm: 48, md: 56 }
                  }}
                >
                  <HowToVote />
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" } }}
                >
                  Student Dashboard
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ opacity: 0.9, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                >
                  Welcome back, {studentProfile?.fullName || studentProfile?.email}!
                  {studentProfile?.department && ` � ${studentProfile.department}`}
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  <Chip
                    size="small"
                    label={`${announcements.length} Announcements`}
                    icon={<Notifications />}
                    variant="outlined"
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.45)",
                      background: "rgba(255,255,255,0.12)"
                    }}
                  />
                  <Chip
                    size="small"
                    label={`${candidates.length} Candidates`}
                    icon={<People />}
                    variant="outlined"
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.45)",
                      background: "rgba(255,255,255,0.12)"
                    }}
                  />
                  <Chip
                    size="small"
                    label={`${totalVotes} Votes Cast`}
                    icon={<TrendingUp />}
                    variant="outlined"
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.45)",
                      background: "rgba(255,255,255,0.12)"
                    }}
                  />
                </Box>
              </Grid>
              <Grid item>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Tooltip title="View Results">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate("/results")}
                      startIcon={<Poll />}
                      sx={{
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.65)",
                        "&:hover": { background: "rgba(255,255,255,0.12)" }
                      }}
                    >
                      Results
                    </Button>
                  </Tooltip>
                  <Tooltip title="View Profile">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate("/profile")}
                      startIcon={<Person />}
                      sx={{
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.65)",
                        "&:hover": { background: "rgba(255,255,255,0.12)" }
                      }}
                    >
                      Profile
                    </Button>
                  </Tooltip>
                  <Tooltip title="Logout">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={logout}
                      startIcon={<Logout />}
                      sx={{
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.65)",
                        "&:hover": { background: "rgba(255,255,255,0.12)" }
                      }}
                    >
                      Logout
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {lastBlockchainVote?.txHash && (
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Blockchain transaction submitted
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}>
                  Tx Hash: {lastBlockchainVote.txHash}
                </Typography>
                {lastBlockchainVote.txUrl && (
                  <Link
                    href={lastBlockchainVote.txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ display: "inline-block", mt: 0.5, fontSize: "0.8rem" }}
                  >
                    View transaction on explorer
                  </Link>
                )}
              </Alert>
            </Box>
          )}

          <Box className="dashboard-tabbar" sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  fontWeight: "bold",
                  fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.9rem" },
                  minHeight: { xs: 48, sm: 60 },
                  minWidth: { xs: 80, sm: 100 }
                }
              }}
            >
              <Tab icon={<HowToVote />} label="VOTE" />
              <Tab icon={<People />} label="CANDIDATES" />
              <Tab icon={<Announcement />} label="ANNOUNCEMENTS" />
              <Tab icon={<Schedule />} label="TIMELINE" />
              <Tab icon={<History />} label="VOTING HISTORY" />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Zoom in>
              <Alert
                severity={
                  electionStatus === "active"
                    ? "success"
                    : electionStatus === "scheduled"
                    ? "info"
                    : electionStatus === "ended"
                    ? "warning"
                    : "error"
                }
                icon={
                  electionStatus === "active" ? (
                    <HowToVote />
                  ) : electionStatus === "scheduled" ? (
                    <Schedule />
                  ) : electionStatus === "ended" ? (
                    <CheckCircle />
                  ) : (
                    <Warning />
                  )
                }
                sx={{
                  mb: 4,
                  borderRadius: 3,
                  "& .MuiAlert-message": { width: "100%" }
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 2
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {electionStatus === "active" && "??? ELECTION IS LIVE - Cast your vote now!"}
                      {electionStatus === "scheduled" && "? ELECTION SCHEDULED - Get ready to vote!"}
                      {electionStatus === "ended" && "? ELECTION COMPLETED - Thank you for voting!"}
                      {electionStatus === "not_started" && "?? ELECTION NOT STARTED - Waiting for admin"}
                    </Typography>

                    {electionSettings && (electionStatus === "active" || electionStatus === "scheduled") && (
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                        <AccessTime fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                        {new Date(electionSettings.startTime).toLocaleString()} ? {new Date(electionSettings.endTime).toLocaleString()}
                      </Typography>
                    )}
                  </Box>

                  {timeRemaining && (
                    <Chip
                      label={`${timeRemaining} remaining`}
                      variant="filled"
                      color={electionStatus === "active" ? "success" : "default"}
                      icon={<AccessTime />}
                    />
                  )}
                </Box>
              </Alert>
            </Zoom>

            <TabPanel value={activeTab} index={0}>
              <Paper
                className="dashboard-content-card"
                elevation={2}
                sx={{
                  p: { xs: 2, sm: 3, md: 4 },
                  borderRadius: 3,
                  background: "linear-gradient(145deg, #f6f9ff 0%, #ffffff 100%)",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    mb: 4,
                    gap: 2,
                    flexWrap: "wrap"
                  }}
                >
                  <Typography variant="h5" fontWeight="bold" sx={{ display: "flex", alignItems: "center" }}>
                    <HowToVote sx={{ mr: 1, color: "primary.main" }} />
                    Cast Your Vote
                  </Typography>

                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setOpenCandidateRequestDialog(true)}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Request to be Candidate
                  </Button>

                  {!voted && canVote && (
                    <Alert severity="info" sx={{ borderRadius: 2, flexBasis: "100%" }}>
                      <Typography variant="body2">
                        <strong>Important:</strong> You can only vote once. Your choice is final.
                      </Typography>
                    </Alert>
                  )}
                </Box>

                {voted ? (
                  <Fade in>
                    <Box sx={{ textAlign: "center", py: { xs: 4, sm: 6 }, px: 2 }}>
                      <CheckCircle sx={{ fontSize: { xs: 60, sm: 80 }, color: "success.main", mb: 2 }} />
                      <Typography variant="h5" color="success.main" gutterBottom>
                        ? Vote Submitted Successfully!
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        You voted for: <strong>{selectedCandidate.name}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        You have voted for {Object.keys(studentVotes).length + 1} out of {positions.length} positions.
                      </Typography>
                      <Chip label={selectedCandidate.party} variant="outlined" color="primary" sx={{ mb: 2 }} />
                      <Typography variant="body2" sx={{ mt: 2, maxWidth: 600, mx: "auto", color: "#000" }}>
                        Your vote has been securely recorded. {Object.keys(studentVotes).length + 1 < positions.length ? 'Continue voting for other positions.' : 'You have completed voting for all positions.'}
                      </Typography>

                      <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                        <Button variant="outlined" onClick={() => setVoted(false)} startIcon={<HowToVote />}>
                          Continue Voting
                        </Button>
                        <Button variant="outlined" onClick={() => navigate("/results")} startIcon={<Poll />}>
                          View Results
                        </Button>
                        <Button variant="contained" onClick={() => setActiveTab(3)} startIcon={<History />}>
                          Voting History
                        </Button>
                      </Box>
                    </Box>
                  </Fade>
                ) : !canVote ? (
                  <Fade in>
                    <Box sx={{ textAlign: "center", py: { xs: 4, sm: 6 }, px: 2 }}>
                      <Info sx={{ fontSize: { xs: 60, sm: 80 }, color: "info.main", mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        {electionStatus === "not_started" && "Election has not started yet"}
                        {electionStatus === "scheduled" && "Election will start soon"}
                        {electionStatus === "ended" && "Election has ended"}
                        {candidates.length === 0 && "No candidates available for voting"}
                      </Typography>
                      <Typography variant="body2" sx={{ maxWidth: 500, mx: "auto", color: "#000" }}>
                        {electionStatus === "not_started" && "Please wait for the administrator to start the election."}
                        {electionStatus === "scheduled" &&
                          `The election is scheduled to start on ${new Date(
                            electionSettings?.startTime
                          ).toLocaleString()}.`}
                        {electionStatus === "ended" && "The voting period has ended. Thank you for your interest."}
                        {candidates.length === 0 && "Candidates will be announced soon by the election committee."}
                      </Typography>

                      {electionStatus === "scheduled" && electionSettings?.startTime && (
                        <Box sx={{ mt: 4, maxWidth: 400, mx: "auto" }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Time until voting starts:
                          </Typography>
                          <LinearProgress variant="determinate" value={50} sx={{ height: 8, borderRadius: 4 }} />
                          <Typography variant="caption" sx={{ color: "#000" }}>
                            {new Date(electionSettings.startTime).toLocaleDateString()} at {new Date(electionSettings.startTime).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Fade>
                ) : (
                  <Fade in>
                    <Box>
                      <Typography variant="body1" sx={{ mb: 4, textAlign: "center", color: "#000" }}>
                        Select your preferred candidate from the list below. Click on a candidate to learn more.
                      </Typography>

                      {positions && positions.length > 0 ? (
                        positions.map((pos) => {
                          const posCandidates = candidates.filter(
                            (c) => String(c.position_id || c.position?.id) === String(pos.id)
                          );
                          return (
                            <Box key={pos.id} sx={{ mb: 4 }}>
                              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: "#000" }}>
                                {pos.name}
                              </Typography>
                              <Grid container spacing={3}>
                                {posCandidates.length === 0 ? (
                                  <Grid item xs={12}>
                                    <Paper sx={{ p: 3, textAlign: "center" }}>
                                      <Typography variant="body2" sx={{ color: "#000" }}>
                                        No candidates for this position yet.
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                ) : (
                                  posCandidates.map((candidate) => (
                                    <Grid item xs={12} sm={6} md={4} key={candidate.id}>
                                      <Card
                                        className="dashboard-content-card"
                                        sx={{
                                          borderRadius: 3,
                                          cursor: "pointer",
                                          transition: "all 0.3s ease",
                                          border: "2px solid transparent",
                                          height: "100%",
                                          color: "rgba(255,255,255,0.92)",
                                          background: "linear-gradient(145deg, #081827 0%, #0b2a4c 45%, #041a2f 100%)",
                                          "&:hover": {
                                            transform: "translateY(-8px)",
                                            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                                            borderColor: "rgba(255,255,255,0.25)"
                                          }
                                        }}
                                        onClick={() => handleVoteClick(candidate)}
                                      >
                                        <CardContent
                                          sx={{ p: 3, textAlign: "center", height: "100%", display: "flex", flexDirection: "column" }}
                                        >
                                          <Avatar
                                            sx={{
                                              width: 80,
                                              height: 80,
                                              mx: "auto",
                                              mb: 2,
                                              background:
                                                "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                                              fontSize: "1.5rem",
                                              fontWeight: "bold"
                                            }}
                                          >
                                            {getAvatarText(candidate.name)}
                                          </Avatar>

                                          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ flexGrow: 0, color: "inherit" }}>
                                            {candidate.name}
                                          </Typography>

                                          <Chip
                                            label={candidate.party}
                                            variant="outlined"
                                            color="primary"
                                            sx={{
                                              mb: 2,
                                              borderColor: "rgba(255,255,255,0.4)",
                                              color: "rgba(255,255,255,0.92)"
                                            }}
                                          />

                                          {candidate.bio && (
                                            <Typography
                                              variant="body2"
                                              sx={{ mb: 2, flexGrow: 1, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}
                                            >
                                              {candidate.bio.length > 100
                                                ? `${candidate.bio.substring(0, 100)}...`
                                                : candidate.bio}
                                            </Typography>
                                          )}

                                          <Box sx={{ mt: "auto", pt: 2 }}>
                                            {electionStatus === "ended" && (
                                              <Typography
                                                variant="caption"
                                                sx={{ display: "block", mb: 1, color: "rgba(255,255,255,0.7)" }}
                                              >
                                                Votes: {candidate.vote_count || 0}
                                              </Typography>
                                            )}
                                            <Button
                                              variant="contained"
                                              startIcon={<HowToVote />}
                                              fullWidth
                                              disabled={!!studentVotes[String(pos.id)]}
                                              sx={{
                                                borderRadius: 3,
                                                background:
                                                  "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                                                "&:hover": {
                                                  background:
                                                    "linear-gradient(130deg, #0e7490 0%, #0b5a8f 40%, #063b5f 70%, #021b2b 100%)"
                                                }
                                              }}
                                            >
                                              {studentVotes[String(pos.id)]
                                                ? "Already Voted"
                                                : `Vote for ${candidate.name.split(" ")[0]}`}
                                            </Button>
                                          </Box>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))
                                )}
                              </Grid>
                            </Box>
                          );
                        })
                      ) : (
                        <Grid container spacing={3}>
                          {candidates.map((candidate) => (
                            <Grid item xs={12} sm={6} md={4} key={candidate.id}>
                              <Card
                                className="dashboard-content-card"
                                sx={{
                                  borderRadius: 3,
                                  cursor: "pointer",
                                  transition: "all 0.3s ease",
                                  border: "2px solid transparent",
                                  height: "100%",
                                  "&:hover": {
                                    transform: "translateY(-8px)",
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                                    borderColor: "primary.main"
                                  }
                                }}
                                onClick={() => handleVoteClick(candidate)}
                              >
                                <CardContent
                                  sx={{ p: 3, textAlign: "center", height: "100%", display: "flex", flexDirection: "column" }}
                                >
                                  <Avatar
                                    sx={{
                                      width: 80,
                                      height: 80,
                                      mx: "auto",
                                      mb: 2,
                                      background:
                                        "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                                      fontSize: "1.5rem",
                                      fontWeight: "bold"
                                    }}
                                  >
                                    {getAvatarText(candidate.name)}
                                  </Avatar>

                                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ flexGrow: 0, color: "#000" }}>
                                    {candidate.name}
                                  </Typography>

                                  <Chip label={candidate.party} variant="outlined" color="primary" sx={{ mb: 2 }} />

                                  {candidate.bio && (
                                    <Typography variant="body2" sx={{ mb: 2, flexGrow: 1, color: "#000" }}>
                                      {candidate.bio.length > 100 ? `${candidate.bio.substring(0, 100)}...` : candidate.bio}
                                    </Typography>
                                  )}

                                  <Box sx={{ mt: "auto", pt: 2 }}>
                                    {electionStatus === "ended" && (
                                      <Typography variant="caption" sx={{ display: "block", mb: 1, color: "#000" }}>
                                        Votes: {candidate.vote_count || 0}
                                      </Typography>
                                    )}
                                    <Button
                                      variant="contained"
                                      startIcon={<HowToVote />}
                                      fullWidth
                                      sx={{
                                        borderRadius: 3,
                                        background:
                                          "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                                        "&:hover": {
                                          background:
                                            "linear-gradient(130deg, #0e7490 0%, #0b5a8f 40%, #063b5f 70%, #021b2b 100%)"
                                        }
                                      }}
                                    >
                                      Vote for {candidate.name.split(" ")[0]}
                                    </Button>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}

                      <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: "#000" }}>
                          <strong>Need help deciding?</strong> Check candidate profiles, read their manifestos, or chat with our assistant for more information.
                        </Typography>
                      </Alert>
                    </Box>
                  </Fade>
                )}
              </Paper>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, sm: 3, md: 4 },
                  borderRadius: 3,
                  background: "linear-gradient(145deg, #f6f9ff 0%, #ffffff 100%)",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
              >
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: "flex", alignItems: "center" }}>
                  <People sx={{ mr: 1, color: "primary.main" }} />
                  Candidate Profiles
                  <Chip label={`${candidates.length} Candidates`} size="small" color="primary" sx={{ ml: 2 }} />
                </Typography>

                {candidates.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <People sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No candidates announced yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Candidate information will be displayed here once announced by the election committee.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={3}>
                      {candidates.map((candidate) => (
                        <Grid item xs={12} md={6} key={candidate.id}>
                          <Card
                            sx={{
                              borderRadius: 3,
                              height: "100%",
                              transition: "all 0.3s ease",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: "0 12px 35px rgba(0,0,0,0.15)"
                              }
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                                <Avatar
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    mr: 2,
                                    background:
                                      "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                                    fontSize: "1.5rem",
                                    fontWeight: "bold"
                                  }}
                                >
                                  {getAvatarText(candidate.name)}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    {candidate.name}
                                  </Typography>
                                  <Chip label={candidate.party} variant="outlined" color="primary" size="small" />
                                  {electionStatus === "ended" && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                      <TrendingUp fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                      {candidate.vote_count || 0} votes
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {candidate.bio && (
                                <Box sx={{ mb: 3 }}>
                                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    About Candidate:
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    {candidate.bio}
                                  </Typography>
                                </Box>
                              )}

                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="caption" color="text.secondary">
                                  Candidate ID: {candidate.id}
                                </Typography>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleVoteClick(candidate)}
                                  disabled={!canVote || voted}
                                  startIcon={<HowToVote />}
                                >
                                  {voted && selectedCandidate?.id === candidate.id ? "Voted ?" : "Vote Now"}
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    <Box sx={{ mt: 4, p: 3, background: "rgba(102, 126, 234, 0.05)", borderRadius: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        ?? Election Statistics
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                            <Typography variant="h4" color="primary" fontWeight="bold">
                              {totalVotes}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Votes
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                            <Typography variant="h4" color="secondary" fontWeight="bold">
                              {candidates.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Candidates
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                            <Typography variant="h4" color="success" fontWeight="bold">
                              {voted ? "1" : "0"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Your Vote
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                            <Typography variant="h4" color="warning" fontWeight="bold">
                              {timeRemaining || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Time Remaining
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                )}
              </Paper>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, sm: 3, md: 4 },
                  borderRadius: 3,
                  background: "linear-gradient(145deg, #f6f9ff 0%, #ffffff 100%)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  minHeight: 500
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ display: "flex", alignItems: "center" }}>
                    <Announcement sx={{ mr: 1, color: "primary.main" }} />
                    Announcement Gallery
                  </Typography>
                  <Chip label={`${announcements.length} announcements`} size="small" color="primary" icon={<Notifications />} />
                </Box>

                {featuredImageUrl && (
                  <Box
                    sx={{
                      mb: 4,
                      borderRadius: 3,
                      overflow: "hidden",
                      position: "relative",
                      height: { xs: 180, sm: 220, md: 260 }
                    }}
                  >
                    <Box
                      component="img"
                      src={featuredImageUrl}
                      alt={featuredAnnouncement?.title || "Featured Poster"}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "brightness(0.7)"
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        p: 3,
                        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 80%)"
                      }}
                    >
                      <Typography variant="h5" fontWeight="bold" color="common.white">
                        {featuredAnnouncement?.title || "Featured Announcement"}
                      </Typography>
                      <Typography variant="body2" color="common.white" sx={{ mt: 1, maxWidth: 680 }}>
                        {featuredAnnouncement?.text?.slice(0, 140)}{featuredAnnouncement?.text?.length > 140 ? '…' : ''}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {announcements.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Announcement sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No announcements yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Important updates will appear here
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {announcements.map((announcement, index) => {
                      const imageUrl =
                        announcement.image ||
                        announcement.image_url ||
                        announcement.poster_url ||
                        extractImageUrlFromText(announcement.text);

                      return (
                        <Grid item xs={12} sm={6} md={4} key={announcement.id}>
                          <Fade in style={{ transitionDelay: `${index * 80}ms` }}>
                            <Card
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                borderRadius: 3,
                                overflow: 'hidden',
                                boxShadow: '0 12px 22px rgba(0,0,0,0.08)',
                                transition: 'transform 180ms ease',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 18px 30px rgba(0,0,0,0.12)'
                                }
                              }}
                              onClick={() => openAnnouncementDialog(announcement)}
                            >
                              {imageUrl ? (
                                <Box sx={{ width: '100%', height: 160, overflow: 'hidden' }}>
                                  <img
                                    src={imageUrl}
                                    alt={announcement.title || 'Announcement'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: 160,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText'
                                  }}
                                >
                                  <Announcement sx={{ fontSize: 48 }} />
                                </Box>
                              )}

                              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                  {new Date(announcement.timestamp).toLocaleString()}
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                                  {announcement.title || 'Untitled Announcement'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, height: 54, overflow: 'hidden' }}>
                                  {announcement.text}
                                </Typography>
                                <Chip
                                  label={announcement.priority?.toUpperCase() || 'MEDIUM'}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    announcement.priority === 'high'
                                      ? 'error'
                                      : announcement.priority === 'low'
                                      ? 'success'
                                      : 'warning'
                                  }
                                />
                              </CardContent>
                            </Card>
                          </Fade>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Paper>

              <Dialog open={Boolean(selectedAnnouncement)} onClose={() => setSelectedAnnouncement(null)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedAnnouncement?.title || 'Announcement'}
                  </Typography>
                  <IconButton onClick={() => setSelectedAnnouncement(null)}>
                    <Close />
                  </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                  {selectedAnnouncement?.image || selectedAnnouncement?.image_url || selectedAnnouncement?.poster_url ? (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={
                          selectedAnnouncement.image ||
                          selectedAnnouncement.image_url ||
                          selectedAnnouncement.poster_url
                        }
                        alt={selectedAnnouncement?.title || 'Announcement'}
                        style={{ width: '100%', borderRadius: 10, maxHeight: 360, objectFit: 'cover' }}
                      />
                    </Box>
                  ) : null}

                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedAnnouncement?.text}
                  </Typography>
                </DialogContent>
              </Dialog>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, sm: 3, md: 4 },
                  borderRadius: 3,
                  background: "linear-gradient(145deg, #f6f9ff 0%, #ffffff 100%)",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
              >
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: "flex", alignItems: "center" }}>
                  <Schedule sx={{ mr: 1, color: "primary.main" }} />
                  Election Timeline
                </Typography>

                {!electionSettings ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <Schedule sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Election schedule not set
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Stepper
                      activeStep={
                        electionStatus === "not_started"
                          ? 0
                          : electionStatus === "scheduled"
                          ? 1
                          : electionStatus === "active"
                          ? 2
                          : 3
                      }
                      alternativeLabel
                      sx={{ mb: 6 }}
                    >
                      <Step>
                        <StepLabel>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Preparation
                          </Typography>
                          <Typography variant="caption">Candidate registration</Typography>
                        </StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Campaign Period
                          </Typography>
                          <Typography variant="caption">Campaigning and debates</Typography>
                        </StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Voting Period
                          </Typography>
                          <Typography variant="caption">
                            {new Date(electionSettings.startTime).toLocaleDateString()} - {new Date(electionSettings.endTime).toLocaleDateString()}
                          </Typography>
                        </StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Results
                          </Typography>
                          <Typography variant="caption">Counting and announcement</Typography>
                        </StepLabel>
                      </Step>
                    </Stepper>

                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6}>
                        <Card sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarToday sx={{ mr: 1, color: "primary.main" }} />
                            Key Dates
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, p: 2, background: "rgba(0,0,0,0.02)", borderRadius: 2 }}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Voting Start
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(electionSettings.startTime).toLocaleString()}
                                </Typography>
                              </Box>
                              <Chip
                                label={new Date(electionSettings.startTime) > new Date() ? "Upcoming" : "Completed"}
                                size="small"
                                color={new Date(electionSettings.startTime) > new Date() ? "info" : "success"}
                              />
                            </Box>

                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, p: 2, background: "rgba(0,0,0,0.02)", borderRadius: 2 }}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Voting End
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(electionSettings.endTime).toLocaleString()}
                                </Typography>
                              </Box>
                              <Chip
                                label={new Date(electionSettings.endTime) > new Date() ? "Upcoming" : "Completed"}
                                size="small"
                                color={new Date(electionSettings.endTime) > new Date() ? "info" : "success"}
                              />
                            </Box>
                          </Box>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                            <AccessTime sx={{ mr: 1, color: "primary.main" }} />
                            Current Status
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Election Status
                              </Typography>
                              <Chip
                                label={
                                  electionStatus === "active"
                                    ? "ACTIVE"
                                    : electionStatus === "scheduled"
                                    ? "SCHEDULED"
                                    : electionStatus === "ended"
                                    ? "COMPLETED"
                                    : "NOT STARTED"
                                }
                                color={
                                  electionStatus === "active"
                                    ? "success"
                                    : electionStatus === "scheduled"
                                    ? "info"
                                    : electionStatus === "ended"
                                    ? "warning"
                                    : "error"
                                }
                                sx={{ fontWeight: "bold" }}
                              />
                            </Box>

                            <Box sx={{ mb: 3 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Your Voting Status
                              </Typography>
                              <Chip
                                label={voted ? "VOTED ?" : "NOT VOTED"}
                                color={voted ? "success" : "warning"}
                                icon={voted ? <CheckCircle /> : <Warning />}
                                sx={{ fontWeight: "bold" }}
                              />
                            </Box>

                            {timeRemaining && (
                              <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Time Remaining
                                </Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                  {timeRemaining}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Paper>
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, sm: 3, md: 4 },
                  borderRadius: 3,
                  background: "linear-gradient(145deg, #f6f9ff 0%, #ffffff 100%)",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
              >
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: "flex", alignItems: "center" }}>
                  <History sx={{ mr: 1, color: "primary.main" }} />
                  Your Voting History
                </Typography>

                {!voted ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <History sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No voting history found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      You haven't voted in this election yet.
                    </Typography>
                    {canVote && (
                      <Button variant="contained" onClick={() => setActiveTab(0)} startIcon={<HowToVote />}>
                        Vote Now
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ textAlign: "center", mb: 4 }}>
                        <Avatar
                          sx={{
                            width: 100,
                            height: 100,
                            mx: "auto",
                            mb: 3,
                            background: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
                            fontSize: "2rem",
                            fontWeight: "bold"
                          }}
                        >
                          {getAvatarText(selectedCandidate?.name)}
                        </Avatar>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                          {selectedCandidate?.name}
                        </Typography>
                        <Chip label={selectedCandidate?.party} variant="outlined" color="primary" sx={{ mb: 2 }} />
                      </Box>

                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                              Voting Details
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                <Typography variant="body2">Voting Time:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {selectedCandidate?.timestamp
                                    ? new Date(selectedCandidate.timestamp).toLocaleString()
                                    : "N/A"}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                <Typography variant="body2">Voter ID:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {studentProfile?.registrationNumber || "N/A"}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2">Vote Status:</Typography>
                                <Chip label="CONFIRMED" size="small" color="success" icon={<VerifiedUser />} />
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                              Security Information
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                <Security sx={{ mr: 1, color: "success.main" }} />
                                <Typography variant="body2">Vote is encrypted and stored securely</Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                <VerifiedUser sx={{ mr: 1, color: "success.main" }} />
                                <Typography variant="body2">Your identity is verified and anonymous</Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                <History sx={{ mr: 1, color: "success.main" }} />
                                <Typography variant="body2">Vote recorded in blockchain-based audit trail</Typography>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 4, textAlign: "center" }}>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                          Thank you for participating in the democratic process. Your vote matters!
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                          <Button variant="outlined" onClick={() => navigate("/results")} startIcon={<Poll />}>
                            View Election Results
                          </Button>
                          <Button variant="contained" onClick={() => window.print()} startIcon={<Print />}>
                            Print Receipt
                          </Button>
                          <Button variant="outlined" startIcon={<Share />}>
                            Share
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Paper>
            </TabPanel>

            <Paper
              elevation={1}
              sx={{
                mt: 4,
                p: 2,
                borderRadius: 3,
                background: "linear-gradient(120deg, #0a2239 0%, #0d4f7a 45%, #0284c7 100%)",
                color: "white"
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate("/results")}
                    startIcon={<Poll />}
                    sx={quickActionButtonSx}
                  >
                    Results
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setActiveTab(2)}
                    startIcon={<Announcement />}
                    sx={quickActionButtonSx}
                  >
                    Announcements
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setChatOpen(true)}
                    startIcon={<Chat />}
                    sx={quickActionButtonSx}
                  >
                    Help
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => window.print()}
                    startIcon={<Print />}
                    sx={quickActionButtonSx}
                  >
                    Print Dashboard
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Paper>

        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => setChatOpen(true)}
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            background: "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
            "&:hover": {
              background: "linear-gradient(130deg, #0e7490 0%, #0b5a8f 40%, #063b5f 70%, #021b2b 100%)",
              transform: "scale(1.1)"
            },
            transition: "all 0.3s ease"
          }}
        >
          <Badge badgeContent={messages.length > 1 ? "!" : ""} color="error">
            <SmartToy />
          </Badge>
        </Fab>

        <Dialog
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              height: { xs: "80vh", sm: "70vh" },
              maxHeight: "600px",
              borderRadius: 3
            }
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
              color: "white"
            }}
          >
            <SmartToy sx={{ mr: 1 }} />
            Campus Council Assistant
            <IconButton
              aria-label="close"
              onClick={() => setChatOpen(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: "white"
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>
            <List sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
              {messages.map((message) => (
                <ListItem
                  key={message.id}
                  sx={{
                    flexDirection: message.sender === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    mb: 1
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: "auto", mx: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor: message.sender === "user" ? "primary.main" : "secondary.main",
                        width: 32,
                        height: 32
                      }}
                    >
                      {message.sender === "user" ? <Person /> : <SmartToy />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          maxWidth: "70%",
                          bgcolor: message.sender === "user" ? "primary.light" : "grey.100",
                          color: message.sender === "user" ? "white" : "text.primary",
                          borderRadius: 2,
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        <Typography variant="body2">{message.text}</Typography>
                      </Paper>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          textAlign: message.sender === "user" ? "right" : "left",
                          mt: 0.5,
                          color: "text.secondary"
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              <div ref={messagesEndRef} />
            </List>
            <Divider />
            <Box sx={{ p: 2, display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask me about voting, candidates, or election info..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                sx={{
                  background:
                    "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                  color: "white",
                  "&:hover": {
                    background:
                      "linear-gradient(130deg, #0e7490 0%, #0b5a8f 40%, #063b5f 70%, #021b2b 100%)"
                  },
                  "&:disabled": {
                    background: "grey.300"
                  }
                }}
              >
                <Send />
              </IconButton>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
              color: "white"
            }}
          >
            <HowToVote sx={{ mr: 1 }} />
            Confirm Your Vote
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body1" gutterBottom>
              You are about to vote for:
            </Typography>
            <Box sx={{ textAlign: "center", my: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: "auto",
                  mb: 2,
                  background:
                    "linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)",
                  fontSize: "2rem",
                  fontWeight: "bold"
                }}
              >
                {getAvatarText(selectedCandidate?.name)}
              </Avatar>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {selectedCandidate?.name}
              </Typography>
              <Chip label={selectedCandidate?.party} variant="outlined" color="primary" sx={{ mb: 2 }} />
              {selectedCandidate?.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  "{selectedCandidate.bio}"
                </Typography>
              )}
            </Box>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This action cannot be undone. Once you confirm, your vote is final.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setShowConfirmDialog(false)} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmVote}
              startIcon={<HowToVote />}
              sx={{
                borderRadius: 2,
                background: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #96c93d 0%, #00b09b 100%)"
                }
              }}
            >
              Confirm & Submit Vote
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openCandidateRequestDialog} onClose={() => setOpenCandidateRequestDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.3rem" }}>Request to be a Candidate</DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Submit your request to become a candidate. Admins will review and approve your request.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Position</InputLabel>
              <Select
                value={candidateRequest.position}
                onChange={(e) => setCandidateRequest({ ...candidateRequest, position: e.target.value })}
                label="Position"
              >
                {positions.map((pos) => (
                  <MenuItem key={pos.id} value={pos.id}>
                    {pos.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Party/Team Name"
              value={candidateRequest.party}
              onChange={(e) => setCandidateRequest({ ...candidateRequest, party: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="e.g., Blue Party"
            />

            <TextField
              fullWidth
              label="Bio"
              value={candidateRequest.bio}
              onChange={(e) => setCandidateRequest({ ...candidateRequest, bio: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              placeholder="Tell us about yourself..."
            />

            <TextField
              fullWidth
              label="Manifesto"
              value={candidateRequest.manifesto}
              onChange={(e) => setCandidateRequest({ ...candidateRequest, manifesto: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              placeholder="Your campaign promises and vision..."
            />

            <TextField
              fullWidth
              label="Phone"
              value={candidateRequest.phone}
              onChange={(e) => setCandidateRequest({ ...candidateRequest, phone: e.target.value })}
              sx={{ mb: 2 }}
              type="tel"
            />

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> You must be a verified student to be approved as a candidate.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCandidateRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleCandidateRequest} variant="contained" color="primary">
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
