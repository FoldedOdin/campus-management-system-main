import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  getFacultyClasses, 
  getClassStudents, 
  getInternalMarks,
  upsertMarks
} from '../../services/marksService';
import BatchcoordinatorSidebar from './BatchcoordinatorSidebar';

const BatchMarks = () => {
  const [facultyId, setFacultyId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [assessmentType, setAssessmentType] = useState('internal1');
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState(50); // Default max marks
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch faculty ID and classes on mount
  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");
        
        setFacultyId(session.user.id);
        const facultyClasses = await getFacultyClasses(session.user.id);
        setClasses(facultyClasses);
      } catch (error) {
        console.error("Error fetching faculty data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyData();
  }, []);

  // Fetch subjects when class changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClass || !facultyId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('class_id', selectedClass)
          .eq('faculty_id', facultyId);

        if (error) throw error;
        setSubjects(data || []);
        setSelectedSubject('');
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [selectedClass, facultyId]);

  // Fetch students and marks when subject or assessment type changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSubject) return;
      
      try {
        setLoading(true);
        const [studentsData, marksData] = await Promise.all([
          getClassStudents(selectedClass),
          getInternalMarks(selectedSubject, assessmentType)
        ]);

        setStudents(studentsData);
        
        // Initialize marks state
        const marksObj = {};
        studentsData.forEach(student => {
          const existingMark = marksData.find(m => m.student_id === student.id);
          marksObj[student.id] = existingMark ? 
            (assessmentType === 'internal1' ? existingMark.internal1_marks : existingMark.internal2_marks) : '';
        });
        setMarks(marksObj);

        // Set max marks if available
        if (marksData.length > 0 && marksData[0].max_marks) {
          setMaxMarks(marksData[0].max_marks);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSubject, assessmentType, selectedClass]);

  const handleMarkChange = (studentId, value) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubject) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const marksData = Object.entries(marks).map(([studentId, markValue]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        marks: markValue ? parseFloat(markValue) : null
      }));

      await upsertMarks(marksData, maxMarks, assessmentType);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving marks:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <BatchcoordinatorSidebar />
    <div className="p-6 max-w-4xl mx-auto text-black bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Internal Marks Entry</h2>
      
      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={loading}
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={!selectedClass || loading}
          >
            <option value="">Select Subject</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={loading}
          >
            <option value="internal1">Internal 1</option>
            <option value="internal2">Internal 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
          <input
            type="number"
            min="1"
            max="100"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={loading}
          />
        </div>
      </div>

      {/* Marks Entry Table */}
      {selectedSubject && (
        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Marks (Max: {maxMarks})
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map(student => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{student.reg_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{student.name_of_student}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        value={marks[student.id] || ''}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        className="w-20 p-1 border rounded"
                        disabled={loading}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submit Button */}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </form>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          Marks saved successfully!
        </div>
      )}
    </div>
    </div>
  );
};

export default BatchMarks;