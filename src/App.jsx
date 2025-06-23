import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';  // Ensure correct import path
import Login from './components/auth/Login';
import HODDashboard from './pages/HODDashboard';
import ClassManagement from './components/hod/ClassManagement';
import FacultyManagement from './components/hod/FacultyManagement';
import StudentManagement from './components/hod/StudentManagement';
import FacultySubjectAssignment from './components/hod/FacultySubject';
import FacultyDashboard from './pages/FacultyDashboard';
import MarksEntry from './components/faculty/MarksEntry';
import AssignmentManagement from './components/faculty/AssignmentManagement';
import AttendanceManagement from './components/faculty/AttendanceManagement';
import BatchCoordinatorDashboard from './pages/BatchCoordinatorDashboard';
import BatchAttendanceManagement from './components/batch-coordinator/BatchAttendanceManagement';
import BatchAssignmentManagement from './components/batch-coordinator/BatchAssignment';
import BatchMarks from './components/batch-coordinator/BatchMarks';
import StudentDashboard from './pages/StudentDashboard';
import ProfileCreation from './components/student/ProfileCreation';
import InternalMarks from './components/student/InternalMarks';
import StudentAssignments from './components/student/StudentAssignments';
import StudentAttendance from './components/student/StudentAttendance';
import StudentRegistration from './components/batch-coordinator/StudentRegistration';
import { supabase } from './services/supabase'

const App = () => {
  return (
    <Router> {/* Router should be on top! */}
      <AuthProvider> {/* Now it is inside Router */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Login />} />
          <Route 
            path="/hod-dashboard" 
            element={<ProtectedRoute component={HODDashboard} requiredRole="HOD" />} 
          />
          <Route 
            path="/hod/classes" 
            element={<ProtectedRoute component={ClassManagement} requiredRole="HOD" />} 
          />
          <Route 
            path="/hod/faculty" 
            element={<ProtectedRoute component={FacultyManagement} requiredRole="HOD" />} 
          />
          <Route 
            path="/hod/students" 
            element={<ProtectedRoute component={StudentManagement} requiredRole="HOD" />} 
          />
          <Route 
            path="/hod/showfaculty" 
            element={<ProtectedRoute component={FacultySubjectAssignment} requiredRole="HOD" />} 
          />
          <Route 
            path="/faculty-dashboard" 
            element={<ProtectedRoute component={FacultyDashboard} requiredRole="Faculty" />} 
          />
          <Route 
            path="/faculty/marks" 
            element={<ProtectedRoute component={MarksEntry} requiredRole="Faculty" />} 
          />
          <Route 
            path="/faculty/assignment" 
            element={<ProtectedRoute component={AssignmentManagement} requiredRole="Faculty" />} 
          />
          <Route 
            path="/faculty/attendance" 
            element={<ProtectedRoute component={AttendanceManagement} requiredRole="Faculty" />} 
          />
          <Route 
            path="/batch-coordinator-dashboard" 
            element={<ProtectedRoute component={BatchCoordinatorDashboard} requiredRole="Faculty" />} 
          />
          <Route 
            path="/batch-coordinator/student-registration" 
            element={<ProtectedRoute component={StudentRegistration} requiredRole="Faculty" />} 
          />
          <Route 
            path="batch-coordinator/attendance" 
            element={<ProtectedRoute component={BatchAttendanceManagement} requiredRole="Faculty" />} 
          />
          <Route 
            path="batch-coordinator/assignment" 
            element={<ProtectedRoute component={BatchAssignmentManagement} requiredRole="Faculty" />} 
          />
          <Route 
            path="batch-coordinator/marks" 
            element={<ProtectedRoute component={BatchMarks} requiredRole="Faculty" />} 
          />
          <Route 
            path="/student-dashboard" 
            element={<ProtectedRoute component={StudentDashboard} requiredRole="Student" />} 
          />
          <Route 
            path="/student/profile" 
            element={<ProtectedRoute component={ProfileCreation} requiredRole="Student" />} 
          />
          <Route 
            path="/student/internals" 
            element={<ProtectedRoute component={InternalMarks} requiredRole="Student" />} 
          />
          <Route 
            path="/student/assignment" 
            element={<ProtectedRoute component={StudentAssignments} requiredRole="Student" />} 
          />
          <Route 
            path="/student/attendance" 
            element={<ProtectedRoute component={StudentAttendance} requiredRole="Student" />} 
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};


// Protected Route Component
const ProtectedRoute = ({ component: Component, requiredRole }) => {
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Fetch user role
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (error || userData.role !== requiredRole) {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
      
      setIsLoading(false);
    };

    checkAuthorization();
  }, [requiredRole]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <Component />;
};

export default App;