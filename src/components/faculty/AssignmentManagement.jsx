import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import FacultySidebar from './FacultySidebar';

const AssignmentManagement = () => {
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignment, setAssignment] = useState({
    subject_id: '',
    subject_name: '',
    class_id: '',
    class_name: '',
    title: '',
    description: '',
    due_date: '',
    max_score: ''
  });
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [facultySubjects, setFacultySubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select(`id, name, class_id, classes(id, name)`)
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

  // Fetch assignments and students when class selection changes
  useEffect(() => {
    if (selectedClass && userId) {
      fetchAssignments();
      fetchStudents();
      fetchSubmissions();
    }
  }, [selectedClass, userId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('created_by', userId);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, name_of_student')
        .eq('class_id', selectedClass);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('class_id', selectedClass);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAssignment(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'subject_id') {
      const selectedSubject = facultySubjects.find(sub => sub.id === value);
      if (selectedSubject) {
        setAssignment(prev => ({
          ...prev,
          subject_name: selectedSubject.name,
          class_id: selectedSubject.class_id,
          class_name: selectedSubject.classes.name
        }));
      }
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Session expired. Please login again.");

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          created_by: session.user.id,
          subject_id: assignment.subject_id,
          subject_name: assignment.subject_name,
          class_id: assignment.class_id,
          class_name: assignment.class_name,
          title: assignment.title,
          description: assignment.description,
          due_date: assignment.due_date,
          max_score: assignment.max_score
        })
        .select();

      if (assignmentError) throw assignmentError;

      // Create submission records for all students in the class
      if (students?.length > 0) {
        const submissionRecords = students.map(student => ({
          assignment_id: assignmentData[0].id,
          student_id: student.id,
          subject_name: assignment.subject_name,
          class_id: assignment.class_id,
          status: false
        }));

        const { error: submissionError } = await supabase
          .from('assignment_submissions')
          .insert(submissionRecords);

        if (submissionError) throw submissionError;
      }

      await fetchAssignments();
      await fetchSubmissions();
      setShowAssignmentForm(false);
      setAssignment({
        subject_id: '',
        subject_name: '',
        class_id: '',
        class_name: '',
        title: '',
        description: '',
        due_date: '',
        max_score: ''
      });
    } catch (error) {
      console.error('Assignment creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId, status) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('assignment_submissions')
        .update({ status })
        .eq('id', submissionId);

      if (error) throw error;
      await fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
      setError('Failed to update submission status');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get submission for a student and assignment
  const getSubmissionForStudent = (studentId, assignmentId) => {
    return submissions.find(
      sub => sub.student_id === studentId && sub.assignment_id === assignmentId
    );
  };

  return (
    <div className="flex">
      <FacultySidebar />
      <div className="flex-1 p-5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Assignment Management</h1>
          <button
            onClick={() => setShowAssignmentForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create New Assignment
          </button>
        </div>

        {/* Class Selection */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Select Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a Class</option>
            {Array.from(new Set(facultySubjects.map(sub => sub.class_id))).map(classId => {
              const subject = facultySubjects.find(sub => sub.class_id === classId);
              return (
                <option key={classId} value={classId}>
                  {subject.classes.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Assignment Creation Modal */}
        {showAssignmentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create New Assignment</h2>
                <button 
                  onClick={() => setShowAssignmentForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={createAssignment}>
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Subject</label>
                  <select
                    name="subject_id"
                    value={assignment.subject_id}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Subject</option>
                    {facultySubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.classes.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={assignment.title}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Description</label>
                  <textarea
                    name="description"
                    value={assignment.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows="3"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={assignment.due_date}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Max Score</label>
                  <input
                    type="number"
                    name="max_score"
                    value={assignment.max_score}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignmentForm(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assignments List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="text-black space-y-6">
            {selectedClass && assignments.length > 0 ? (
              assignments.map(assignment => (
                <div key={assignment.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{assignment.title}</h3>
                      <p className="text-gray-600">{assignment.subject_name} • {assignment.class_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                      <p className="text-sm">Max Score: {assignment.max_score}</p>
                    </div>
                  </div>
                  <p className="mb-4">{assignment.description}</p>
                  
                  {/* Submissions Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => {
                          const submission = getSubmissionForStudent(student.id, assignment.id);
                          return (
                            <tr key={`${assignment.id}-${student.id}`}>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {student.name_of_student}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  submission?.status ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {submission?.status ? 'Submitted' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {submission?.file_url ? (
                                  <a 
                                    href={submission.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    View File
                                  </a>
                                ) : 'No file'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap space-x-2">
                                {submission && (
                                  <button
                                    onClick={() => updateSubmissionStatus(submission.id, !submission.status)}
                                    className={`px-3 py-1 text-sm rounded ${
                                      submission.status 
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                        : 'bg-green-500 text-white hover:bg-green-600'
                                    }`}
                                  >
                                    {submission.status ? 'Mark Pending' : 'Mark Submitted'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                {selectedClass ? 'No assignments found for this class' : 'Please select a class to view assignments'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentManagement;