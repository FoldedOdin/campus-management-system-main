import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import StudentSidebar from './StudentSidebar';

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error("Failed to authenticate user");
        }

        // Fetch student profile
        const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Fetch all subjects to create a mapping
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name');

        if (subjectsError) throw subjectsError;
        const subjectMap = new Map(subjectsData.map(subject => [subject.id, subject.name]));

        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('class_id', profileData.class_id);

        if (assignmentsError) throw assignmentsError;

        // Fetch submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', user.id);

        if (submissionsError) throw submissionsError;

        // Combine assignments with submission status
        const combinedAssignments = assignmentsData?.map(assignment => ({
          ...assignment,
          subject_name: subjectMap.get(assignment.subject_id) || 'N/A',
          submission: submissionsData.find(sub => sub.assignment_id === assignment.id)
        })) || [];

        // Fetch attendance
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', user.id);

        if (attendanceError) throw attendanceError;

        // Add subject names to attendance
        const attendanceWithSubjects = attendanceData?.map(record => ({
          ...record,
          subject_name: subjectMap.get(record.subject_id) || 'N/A'
        })) || [];

        // Fetch internal marks
        const { data: marksData, error: marksError } = await supabase
          .from('internal_marks')
          .select('*')
          .eq('student_id', user.id);

        if (marksError) throw marksError;

        // Add subject names to marks
        const marksWithSubjects = marksData?.map(mark => ({
          ...mark,
          subject_name: subjectMap.get(mark.subject_id) || 'N/A'
        })) || [];

        setStudentData(profileData);
        setAssignments(combinedAssignments);
        setAttendance(attendanceWithSubjects);
        setMarks(marksWithSubjects);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center text-red-500">Failed to load student data</div>
        </div>
      </div>
    );
  }

  // Calculate overall attendance percentage
  const overallAttendance = attendance.length > 0 
    ? (attendance.reduce((sum, record) => sum + record.attendance_percentage, 0) / attendance.length).toFixed(1)
    : 0;

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Student Profile Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Welcome, {studentData.name_of_student}
                </h1>
                <p className="text-gray-600">{studentData.dept} - {studentData.class_name}</p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center">
                  <span className="text-lg font-medium mr-2">Overall Attendance:</span>
                  <span className={`text-xl font-bold ${
                    overallAttendance >= 75 ? 'text-green-600' : 
                    overallAttendance >= 50 ? 'text-yellow-500' : 'text-red-600'
                  }`}>
                    {overallAttendance}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow">
              <h3 className="font-medium text-blue-800 mb-2">Pending Assignments</h3>
              <p className="text-3xl font-bold">
                {assignments.filter(a => !a.submission?.status).length}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h3 className="font-medium text-green-800 mb-2">Completed Assignments</h3>
              <p className="text-3xl font-bold">
                {assignments.filter(a => a.submission?.status).length}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow">
              <h3 className="font-medium text-purple-800 mb-2">Subjects</h3>
              <p className="text-3xl font-bold">
                {[...new Set(marks.map(mark => mark.subject_id))].length}
              </p>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Recent Assignments</h2>
              <a href="/student/assignments" className="text-blue-600 hover:underline">
                View All
              </a>
            </div>
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.slice(0, 3).map(assignment => (
                  <div key={assignment.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <p className="text-sm text-gray-600">
                          {assignment.subject_name} • Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        assignment.submission?.status 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assignment.submission?.status ? 'Submitted' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">{assignment.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No assignments found</div>
            )}
          </div>

          {/* Recent Marks and Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Recent Marks */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Recent Marks</h2>
                <a href="/student/marks" className="text-blue-600 hover:underline">
                  View All
                </a>
              </div>
              {marks.length > 0 ? (
                <div className="space-y-4">
                  {marks.slice(0, 3).map(mark => (
                    <div key={mark.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{mark.subject_name}</span>
                        <span className="font-bold">
                          {mark.internal1_marks ?? '-'}/{mark.internal2_marks ?? '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>Max: {mark.max_marks}</span>
                        <span>
                          Total: {((mark.internal1_marks || 0) + (mark.internal2_marks || 0))}/{mark.max_marks * 2}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No marks found</div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Attendance Summary</h2>
                <a href="/student/attendance" className="text-blue-600 hover:underline">
                  View All
                </a>
              </div>
              {attendance.length > 0 ? (
                <div className="space-y-4">
                  {attendance.slice(0, 3).map(record => (
                    <div key={record.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{record.subject_name}</span>
                        <span className="font-bold">{record.attendance_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            record.attendance_percentage >= 75 ? 'bg-green-600' : 
                            record.attendance_percentage >= 50 ? 'bg-yellow-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${record.attendance_percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {record.month}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No attendance records found</div>
              )}
            </div>
          </div>

          {/* Profile Quick View */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Profile Overview</h2>
              <a href="/student/profile" className="text-blue-600 hover:underline">
                Edit Profile
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Registration Number</p>
                <p className="font-medium">{studentData.reg_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{studentData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-medium">{studentData.ph_no || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium">{studentData.date_of_birth || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;