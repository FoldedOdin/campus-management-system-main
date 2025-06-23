// src/pages/BatchCoordinatorDashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BatchcoordiantorSidebar from '../components/batch-coordinator/BatchcoordinatorSidebar'

const BatchCoordinatorDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex">
      <BatchcoordiantorSidebar />
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Batch Coordinator Dashboard</h1>
        {/* <div>
          <span className="mr-4">Welcome, {user?.email}</span>
          <button 
            onClick={logout} 
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div> */}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Link 
          to="/batch-coordinator/student-registration" 
          className="bg-green-500 text-white p-6 rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          <h2 className="text-xl font-semibold">Student Registration</h2>
          <p>Register new students in the system</p>
        </Link>

        <Link 
          to="/batch-coordinator/attendance-management" 
          className="bg-green-500 text-white p-6 rounded-lg shadow-md hover:bg-green-600 transition"
        >
          <h2 className="text-xl font-semibold">Attendance Management</h2>
          <p>Manage class attendance records</p>
        </Link>

        <Link 
          to="/batch-coordinator/student-list" 
          className="bg-green-500 text-white p-6 rounded-lg shadow-md hover:bg-purple-600 transition"
        >
          <h2 className="text-xl font-semibold">Student List</h2>
          <p>View and manage student details</p>
        </Link>
      </div>
    </div>
    </div>
  );
};

export default BatchCoordinatorDashboard;