import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material';
import {
  Person,
  Email,
  School,
  Badge,
  Edit,
  Save,
  Cancel,
  Security,
  HowToVote,
  Logout
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Iridescence from '../components/Iridescence';

const getAvatarText = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export default function Profile() {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(currentUser || {});

  const handleSave = () => {
    updateUserProfile(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(currentUser);
    setIsEditing(false);
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, background: 'transparent', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
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
        <Paper sx={{ maxWidth: 1000, mx: 'auto', p: 4, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="bold">
            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Profile
          </Typography>
          {!isEditing ? (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Box>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', p: 3 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2.5rem',
                  background: 'linear-gradient(130deg, #021b2b 0%, #063b5f 35%, #0b5a8f 65%, #0e7490 100%)'
                }}
              >
                {getAvatarText(currentUser.fullName)}
              </Avatar>
              <Typography variant="h5" fontWeight="bold">
                {currentUser.fullName}
              </Typography>
              <Chip
                label={currentUser.role.toUpperCase()}
                color={currentUser.role === 'admin' ? 'secondary' : 'primary'}
                sx={{ mt: 1 }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                Account Security: Verified
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                Personal Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    value={isEditing ? editedData.fullName : currentUser.fullName}
                    onChange={(e) => setEditedData({...editedData, fullName: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    value={isEditing ? editedData.email : currentUser.email}
                    onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                    disabled={!isEditing}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                {currentUser.role === 'student' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Registration Number"
                        value={isEditing ? editedData.registrationNumber : currentUser.registrationNumber}
                        onChange={(e) => setEditedData({...editedData, registrationNumber: e.target.value})}
                        disabled={!isEditing}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Badge sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Department"
                        value={isEditing ? editedData.department : currentUser.department}
                        onChange={(e) => setEditedData({...editedData, department: e.target.value})}
                        disabled={!isEditing}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <School sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={logout}
            startIcon={<Logout />}
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
      </Box>
    </Box>
  );
}
