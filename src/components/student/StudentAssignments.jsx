import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import StudentSidebar from './StudentSidebar';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Fetch student's class
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('class_id')
            .eq('id', user.id)
            .single();

          if (studentError) throw studentError;

          if (studentData) {
            // Fetch assignments for the student's class
            const { data: assignmentsData, error: assignmentsError } = await supabase
              .from('assignments')
              .select('*')
              .eq('class_id', studentData.class_id);

            if (assignmentsError) throw assignmentsError;
            setAssignments(assignmentsData || []);

            // Fetch submissions by the student
            const { data: submissionsData, error: submissionsError } = await supabase
              .from('assignment_submissions')
              .select('*')
              .eq('student_id', user.id);

            if (submissionsError) throw submissionsError;
            setSubmissions(submissionsData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getSubmissionStatus = (assignmentId) => {
    const submission = submissions.find(sub => sub.assignment_id === assignmentId);
    return submission ? {
      status: submission.status ? 'Submitted' : 'Pending',
      fileUrl: submission.file_url,
      submissionDate: submission.submission_date
    } : null;
  };

  if (loading) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center">Loading assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-white text-black rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Assignments</h2>
          
          {assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const submission = getSubmissionStatus(assignment.id);
                return (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{assignment.title}</h3>
                        <p className="text-sm text-gray-600">{assignment.subject_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                        <p className="text-sm">Max Score: {assignment.max_score}</p>
                      </div>
                    </div>
                    <p className="my-2 text-gray-700">{assignment.description}</p>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Status: </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          submission?.status === 'Submitted' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {submission?.status || 'Not Submitted'}
                        </span>
                      </p>
                      {submission?.fileUrl && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">File: </span>
                          <a 
                            href={submission.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Submission
                          </a>
                        </p>
                      )}
                      {submission?.submissionDate && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Submitted on: </span>
                          {new Date(submission.submissionDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No assignments found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;