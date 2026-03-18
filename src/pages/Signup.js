import React, { useRef, useState } from "react";
import { 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Box, 
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  IconButton,
  Alert,
  Fade,
  Stepper,
  Step,
  StepLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress
} from "@mui/material";
import { 
  Visibility, 
  VisibilityOff,
  Person,
  Email,
  Lock,
  School,
  Badge,
  ArrowForward,
  CheckCircle,
  AdminPanelSettings,
  Security,
  Phone
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import logo from "../logo.svg";
import Iridescence from "../components/Iridescence";

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    registrationNumber: "",
    password: "",
    confirmPassword: "",
    department: "",
    year: "",
    role: "student",
    adminSecret: "",
    phone: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selfieDataUrl, setSelfieDataUrl] = useState("");
  const [selfieError, setSelfieError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const navigate = useNavigate();
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  const departments = [
    "Computer Science",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Business Administration",
    "Arts and Sciences"
  ];

  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const ADMIN_SECRET_KEY = "CAMPUSCOUNCIL2024";
  const ROLE_SECRET_KEY = "CAMPUSCOUNCIL_STAFF_2026";
  const ALLOWED_EMAIL_DOMAIN = "@snmimt.edu.in";

  const parseSignupError = (error) => {
    const message = (error?.message || "").toLowerCase();
    const status = error?.status;

    if (message.includes("user already registered")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (message.includes("password should be at least")) {
      return "Password must be at least 6 characters.";
    }
    if (message.includes("invalid email")) {
      return "Please enter a valid email address.";
    }
    if (message.includes("database error saving new user")) {
      return "Signup failed due to database setup. Run fix_signup_database.sql in Supabase SQL Editor.";
    }
    if (status === 429 || message.includes("rate limit")) {
      return "Too many signup attempts. Please wait a minute and try again.";
    }
    if (message.includes("network") || message.includes("failed to fetch")) {
      return "Network error. Check your internet connection and try again.";
    }
    return error?.message || "Signup failed. Please try again.";
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ""
      });
    }
    setSubmitError("");
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (formData.role === "student") {
      if (!formData.registrationNumber.trim()) {
        newErrors.registrationNumber = "Registration number is required";
      }

      if (!formData.department) {
        newErrors.department = "Department is required";
      }
      if (!formData.year) {
        newErrors.year = "Year is required";
      }
      if (!selfieDataUrl) {
        newErrors.selfie = "Selfie capture is required for face verification";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.role === "admin") {
      if (!formData.adminSecret.trim()) {
        newErrors.adminSecret = "Admin secret key is required";
      } else if (formData.adminSecret !== ADMIN_SECRET_KEY) {
        newErrors.adminSecret = "Invalid admin secret key";
      }
    }

    if (formData.role === "staff_coordinator") {
      if (!formData.adminSecret.trim()) {
        newErrors.adminSecret = "Role access key is required";
      } else if (formData.adminSecret !== ROLE_SECRET_KEY) {
        newErrors.adminSecret = "Invalid role access key";
      }
    }

    if (formData.role === "student") {
      const normalizedEmail = (formData.email || "").trim().toLowerCase();
      if (normalizedEmail && !normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        newErrors.email = `Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed for student signup`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && validateStep1()) {
      setActiveStep(1);
    } else if (activeStep === 1 && validateStep2()) {
      handleSignup();
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSignup = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    
    setTimeout(async () => {
      try {
        const hasSupabaseConfig = !!supabaseUrl && !!supabaseAnonKey;
        const normalizedEmail = formData.email.trim().toLowerCase();

        if (formData.role === "student" && !normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
          setSubmitError(`Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed for student signup.`);
          setIsSubmitting(false);
          return;
        }

        if (hasSupabaseConfig) {
          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: formData.password,
            options: {
              data: {
                full_name: formData.fullName,
                role: formData.role,
                student_id: formData.registrationNumber || null,
                department: formData.department || null,
                year: formData.year || null,
                phone: formData.phone || null,
              }
            }
          });
          if (error) {
            setSubmitError(parseSignupError(error));
            setIsSubmitting(false);
            return;
          }

          const userId = data?.user?.id;
          if (!userId) {
            setSubmitError("Signup failed. No user id returned.");
            setIsSubmitting(false);
            return;
          }

          const hasSession = !!data?.session;
          if (!hasSession) {
            navigate("/login", { 
              state: { 
                message: "Check your email to confirm your account. Then sign in." 
              } 
            });
            setIsSubmitting(false);
            return;
          }

          if (formData.role === "student" && selfieDataUrl) {
            try {
              const selfieBlob = dataUrlToBlob(selfieDataUrl);
              const selfiePath = `${userId}/selfie-${Date.now()}.jpg`;
              const { error: uploadError } = await supabase
                .storage
                .from("user-selfies")
                .upload(selfiePath, selfieBlob, { contentType: "image/jpeg", upsert: true });
              if (uploadError) {
                throw uploadError;
              }

              const { data: publicData } = supabase
                .storage
                .from("user-selfies")
                .getPublicUrl(selfiePath);
              const selfieUrl = publicData?.publicUrl || "";

              if (selfieUrl) {
                await supabase.auth.updateUser({ data: { selfie_url: selfieUrl } });
                await supabase.from("users").update({ selfie_url: selfieUrl }).eq("id", userId);
              }
            } catch (uploadErr) {
              console.error("Selfie upload failed", uploadErr);
              setSubmitError("Selfie upload failed. Please try again after login.");
            }
          }
        } else {
          setSubmitError("Supabase environment variables are missing.");
          setIsSubmitting(false);
          return;
        }

        // Navigate to login
        navigate("/login", { 
          state: { 
                message: `Signup successful! Welcome to Campus Council as ${formData.role}.` 
              } 
            });
      } catch (error) {
        setSubmitError(parseSignupError(error));
      } finally {
        setIsSubmitting(false);
      }
    }, 2000);
  };

  const steps = ['Personal Information', 'Account Setup'];

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setSelfieError("");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed", err);
      setSelfieError("Unable to access camera. Please allow camera permission.");
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelfieDataUrl(dataUrl);
    setErrors((prev) => ({ ...prev, selfie: "" }));
    stopCamera();
  };

  const dataUrlToBlob = (dataUrl) => {
    const [meta, data] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                Select Your Role
              </FormLabel>
              <RadioGroup
                value={formData.role}
                onChange={handleChange('role')}
                sx={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}
              >
                <FormControlLabel 
                  value="student" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <School sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography>Student</Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="admin" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AdminPanelSettings sx={{ mr: 1, color: 'secondary.main' }} />
                      <Typography>Administrator</Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="staff_coordinator" 
                  control={<Radio />} 
                  label={<Typography>Staff Coordinator</Typography>} 
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Full Name"
              value={formData.fullName}
              onChange={handleChange('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Phone Number"
              value={formData.phone}
              onChange={handleChange('phone')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                ),
              }}
            />

            {formData.role === "student" && (
              <>
                <TextField
                  label="Registration Number"
                  value={formData.registrationNumber}
                  onChange={handleChange('registrationNumber')}
                  error={!!errors.registrationNumber}
                  helperText={errors.registrationNumber}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl fullWidth error={!!errors.department}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={formData.department}
                    onChange={handleChange('department')}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.department && (
                    <Typography variant="caption" color="error">
                      {errors.department}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth error={!!errors.year}>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={formData.year}
                    onChange={handleChange('year')}
                    label="Academic Year"
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.year && (
                    <Typography variant="caption" color="error">
                      {errors.year}
                    </Typography>
                  )}
                </FormControl>

                <Card sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Face Verification Selfie
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Capture a clear selfie to enable face verification during voting.
                  </Typography>
                  {selfieError && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {selfieError}
                    </Alert>
                  )}
                  {errors.selfie && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.selfie}
                    </Alert>
                  )}
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "center" }}>
                    <Box sx={{ width: 220, height: 160, borderRadius: 2, overflow: "hidden", background: "rgba(0,0,0,0.08)" }}>
                      {selfieDataUrl ? (
                        <img src={selfieDataUrl} alt="Selfie preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {!cameraActive && !selfieDataUrl && (
                        <Button variant="outlined" onClick={startCamera}>
                          Open Camera
                        </Button>
                      )}
                      {cameraActive && (
                        <Button variant="contained" onClick={captureSelfie}>
                          Capture Selfie
                        </Button>
                      )}
                      {selfieDataUrl && (
                        <Button variant="text" onClick={() => setSelfieDataUrl("")}>
                          Retake
                        </Button>
                      )}
                      {cameraActive && (
                        <Button variant="text" color="warning" onClick={stopCamera}>
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Card>
              </>
            )}

            {(formData.role === "admin" || formData.role === "staff_coordinator") && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{formData.role === "admin" ? "Administrator Account" : "Staff Account"}</strong>
                  <br />
                  {formData.role === "admin" ? "You will have full access to manage elections." : "Role-based management permissions will be applied."}
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email || (formData.role === "student" ? "Use your @snmimt.edu.in email" : "")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth error={!!errors.password}>
              <InputLabel>Password</InputLabel>
              <OutlinedInput
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                startAdornment={
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />
              {errors.password && (
                <Typography variant="caption" color="error">
                  {errors.password}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth error={!!errors.confirmPassword}>
              <InputLabel>Confirm Password</InputLabel>
              <OutlinedInput
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                startAdornment={
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Confirm Password"
              />
              {errors.confirmPassword && (
                <Typography variant="caption" color="error">
                  {errors.confirmPassword}
                </Typography>
              )}
            </FormControl>

            {(formData.role === "admin" || formData.role === "staff_coordinator") && (
              <TextField
                label={formData.role === "admin" ? "Admin Secret Key" : "Role Access Key"}
                type="password"
                value={formData.adminSecret}
                onChange={handleChange('adminSecret')}
                error={!!errors.adminSecret}
                helperText={errors.adminSecret || (formData.role === "admin" ? "Enter: CAMPUSCOUNCIL2024" : "Enter: CAMPUSCOUNCIL_STAFF_2026")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Security sx={{ color: 'secondary.main' }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Password Requirements:</strong>
                <br />• At least 6 characters
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
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
      <Card 
        elevation={10}
        sx={{
          width: '100%',
          maxWidth: 600,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(2, 6, 23, 0.82)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(120deg, #020617 0%, #0f172a 45%, #0ea5e9 100%)',
            color: 'white',
            textAlign: 'center',
            py: 4
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="Campus Council logo"
            sx={{ width: 64, height: 64, mb: 2 }}
          />
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
            Join Campus Council
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Create your account
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {submitError && (
            <Fade in={!!submitError}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {submitError}
              </Alert>
            </Fade>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isSubmitting}
              sx={{
                background: formData.role === 'admin' 
                  ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'
                  : 'linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)'
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : activeStep === steps.length - 1 ? (
                `Create ${formData.role.replace('_', ' ')} Account`
              ) : (
                'Next'
              )}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Button 
                color="primary" 
                onClick={() => navigate('/login')}
                sx={{ fontWeight: 'bold' }}
              >
                Sign In
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

