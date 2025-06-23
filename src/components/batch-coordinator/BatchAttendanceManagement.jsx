import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import BatchcoordinatorSidebar from './BatchcoordinatorSidebar';

const AttendanceManagement = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [facultySubjects, setFacultySubjects] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceInputs, setAttendanceInputs] = useState({});

  // Available months for selection
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch current user and their subjects
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error("Please login to access this page");
        }

        const user = session.user;
        setUserId(user.id);
        
        // Fetch subjects assigned to this faculty
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select(`
            id, 
            name, 
            class_id,
            classes(id, name, batch_year_start, batch_year_end)
          `)
          .eq('faculty_id', user.id);

        if (subjectsError) throw subjectsError;
        setFacultySubjects(subjectsData || []);
      } catch (error) {
        console.error("Error fetching faculty data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Fetch students when class selection changes
  useEffect(() => {
    if (selectedClass && userId) {
      fetchStudents();
    } else {
      setStudents([]);
      setAttendanceInputs({});
    }
  }, [selectedClass, userId]);

  // Reset subject when class changes
  useEffect(() => {
    setSelectedSubject('');
  }, [selectedClass]);

  // Fetch attendance when class, subject or month changes
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedMonth && userId) {
      fetchAttendanceRecords();
    } else {
      setAttendanceRecords([]);
    }
  }, [selectedClass, selectedSubject, selectedMonth, userId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, 
          reg_no, 
          name_of_student, 
          class_id,
          class_name
        `)
        .eq('class_id', selectedClass)
        .order('reg_no', { ascending: true });

      if (error) throw error;
      setStudents(data || []);

      // Initialize empty attendance inputs
      const initialInputs = {};
      data.forEach(student => {
        initialInputs[student.id] = '';
      });
      setAttendanceInputs(initialInputs);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('month', selectedMonth)
        .eq('faculty_id', userId);

      if (error) throw error;
      setAttendanceRecords(data || []);

      // Initialize attendance inputs with existing records
      const initialInputs = {};
      students.forEach(student => {
        const record = data.find(r => r.student_id === student.id);
        initialInputs[student.id] = record ? record.attendance_percentage : '';
      });
      setAttendanceInputs(initialInputs);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, value) => {
    // Ensure value is between 0 and 100
    const percentage = Math.min(100, Math.max(0, value === '' ? '' : Number(value)));
    setAttendanceInputs(prev => ({
      ...prev,
      [studentId]: percentage
    }));
  };

  const saveAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare records to upsert
      const records = students.map(student => ({
        student_id: student.id,
        faculty_id: userId,
        class_id: selectedClass,
        subject_id: selectedSubject,
        month: selectedMonth,
        attendance_percentage: attendanceInputs[student.id] || 0,
        updated_at: new Date().toISOString()
      }));

      // Filter out records where attendance percentage is empty
      const validRecords = records.filter(record => 
        record.attendance_percentage !== '' && 
        record.attendance_percentage !== null
      );

      if (validRecords.length === 0) {
        throw new Error('No attendance data to save');
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(validRecords, { onConflict: ['student_id', 'subject_id', 'month'] });

      if (error) throw error;

      // Refresh attendance records
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get subjects for the selected class
  const getClassSubjects = () => {
    return facultySubjects.filter(subject => subject.class_id === selectedClass);
  };

  return (
    <div className="flex">
      <BatchcoordinatorSidebar />
      <div className="flex-1 p-5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Attendance Management</h1>
        </div>

        {/* Class, Subject and Month Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block mb-2 font-medium">Select Class:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 bg-black border rounded"
              disabled={loading}
            >
              <option value="">Select a Class</option>
              {Array.from(new Set(facultySubjects.map(sub => sub.class_id))).map(classId => {
                const subject = facultySubjects.find(sub => sub.class_id === classId);
                return (
                  <option key={classId} value={classId}>
                    {subject.classes.name} ({subject.classes.batch_year_start}-{subject.classes.batch_year_end})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Select Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 bg-black border rounded"
              disabled={!selectedClass || loading}
            >
              <option value="">Select a Subject</option>
              {getClassSubjects().map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Select Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 bg-black border rounded"
              disabled={!selectedSubject || loading}
            >
              <option value="">Select a Month</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Attendance Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white text-black rounded-lg shadow-md overflow-hidden">
            {selectedClass && selectedSubject && selectedMonth ? (
              <>
                <div className="p-4 bg-gray-50 border-b">
                  <h2 className="text-lg font-semibold">
                    {facultySubjects.find(s => s.id === selectedSubject)?.name} - {selectedMonth}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Class: {facultySubjects.find(s => s.class_id === selectedClass)?.classes?.name}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.length > 0 ? (
                        students.map(student => (
                          <tr key={student.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {student.reg_no}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {student.name_of_student}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={attendanceInputs[student.id] || ''}
                                  onChange={(e) => handleAttendanceChange(student.id, e.target.value)}
                                  className="w-20 p-1 border rounded"
                                  disabled={loading}
                                  placeholder="0-100"
                                />
                                <span className="ml-2">%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-4 py-4 text-center text-gray-500">
                            No students found in this class
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {students.length > 0 && (
                  <div className="p-4 bg-gray-50 flex justify-end">
                    <button
                      onClick={saveAttendance}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {!selectedClass 
                  ? 'Please select a class' 
                  : !selectedSubject 
                    ? 'Please select a subject' 
                    : 'Please select a month to view attendance'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;