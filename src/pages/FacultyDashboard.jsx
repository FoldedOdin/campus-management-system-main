// src/pages/FacultyDashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import FacultySidebar from "../components/faculty/FacultySidebar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

const FacultyDashboard = () => {
  const { user, signOut } = useAuth();
  const [facultyDetails, setFacultyDetails] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        
        // Get faculty details
        const { data: facultyData, error: facultyError } = await supabase
          .from('faculty')
          .select('*')
          .eq('email', user.email)
          .single();

        if (facultyError) throw facultyError;
        setFacultyDetails(facultyData);

        // Get assigned subjects with class information
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select(`
            id,
            name,
            class_id,
            classes (
              id,
              name,
              batch_year_start,
              batch_year_end
            )
          `)
          .eq('faculty_id', facultyData.id);

        if (subjectsError) throw subjectsError;
        setAssignedSubjects(subjectsData || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching faculty data:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchFacultyData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex">
        <FacultySidebar />
        <div className="flex-1 p-5">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <FacultySidebar />
        <div className="flex-1 p-5">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error loading dashboard: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <FacultySidebar />
      <div className="flex-1 p-5">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
          {/* <div className="flex items-center gap-4">
            <span className="font-medium">Welcome, {facultyDetails?.name}</span>
            <button
              onClick={signOut}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div> */}
        </div>

        {/* Faculty Profile Card */}
        <div className="bg-white text-black rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">{facultyDetails?.name}</h2>
              <p className="text-gray-600 mb-1">{facultyDetails?.dept} Department</p>
              <p className="text-gray-600">{facultyDetails?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Phone: {facultyDetails?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Teaching Assignments */}
        <div className="bg-white text-black rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Teaching Assignments</h2>
          
          {assignedSubjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedSubjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{subject.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subject.classes?.name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subject.classes ? 
                          `${subject.classes.batch_year_start} - ${subject.classes.batch_year_end}` : 
                          'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No teaching assignments found</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Link
            to="/faculty/classes"
            className="p-5 bg-lime-500 text-white rounded hover:bg-lime-600 transition text-center"
          >
            Manage Classes
          </Link>
          <Link
            to="/faculty/marks"
            className="p-5 bg-lime-500 text-white rounded hover:bg-lime-600 transition text-center"
          >
            Manage Marks
          </Link>
          <Link
            to="/faculty/assignment"
            className="p-5 bg-lime-500 text-white rounded hover:bg-lime-600 transition text-center"
          >
            Manage Assignments
          </Link>
          <Link
            to="/faculty/students"
            className="p-5 bg-lime-500 text-white rounded hover:bg-lime-600 transition text-center"
          >
            View Students
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;