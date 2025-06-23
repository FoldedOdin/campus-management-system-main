import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import StudentSidebar from './StudentSidebar';

const InternalMarks = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error("Failed to authenticate user");
        }

        // First fetch all subjects to create a mapping
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name');

        if (subjectsError) throw subjectsError;

        const subjectMap = new Map(subjectsData.map(subject => [subject.id, subject.name]));

        // Then fetch internal marks
        const { data: marksData, error: marksError } = await supabase
          .from('internal_marks')
          .select('*')
          .eq('student_id', user.id);

        if (marksError) throw marksError;

        // Combine the data
        const combinedData = marksData?.map(mark => ({
          ...mark,
          subject_name: subjectMap.get(mark.subject_id) || 'N/A'
        })) || [];

        setMarks(combinedData);
      } catch (error) {
        console.error('Error fetching marks:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

  if (loading) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center">Loading marks...</div>
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

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Internal Marks</h2>
          
          {marks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal 1</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal 2</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {marks.map((mark) => (
                    <tr key={mark.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mark.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mark.max_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mark.internal1_marks ?? '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mark.internal2_marks ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No internal marks found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternalMarks;