import { supabase } from './supabase';

export const getFacultyClasses = async (facultyId) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('class_id, classes(id, name)')
      .eq('faculty_id', facultyId);

    if (error) throw error;
    return Array.from(new Set(data.map(item => item.classes)));
  } catch (error) {
    console.error("Error fetching faculty classes:", error);
    throw error;
  }
};

export const getClassStudents = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, reg_no, name_of_student')
      .eq('class_id', classId)
      .order('name_of_student');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching class students:", error);
    throw error;
  }
};

export const getInternalMarks = async (subjectId) => {
  try {
    const { data, error } = await supabase
      .from('internal_marks')
      .select('*')
      .eq('subject_id', subjectId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching internal marks:", error);
    throw error;
  }
};

export const upsertMarks = async (marksData, maxMarks, assessmentType) => {
  try {
    // Step 1: Get all current marks for these students
    const studentIds = marksData.map(m => m.student_id);
    const { data: existingData, error: fetchError } = await supabase
      .from('internal_marks')
      .select('*')
      .in('student_id', studentIds)
      .eq('subject_id', marksData[0]?.subject_id);

    if (fetchError) throw fetchError;

    const existingMap = {};
    existingData.forEach(row => {
      existingMap[`${row.student_id}`] = row;
    });

    // Step 2: Prepare upsert data, preserving the other internal mark
    const upsertData = marksData.map(mark => {
      const existing = existingMap[mark.student_id] || {};

      return {
        student_id: mark.student_id,
        subject_id: mark.subject_id,
        max_marks: maxMarks,
        internal1_marks:
          assessmentType === 'internal1'
            ? mark.marks
            : existing.internal1_marks ?? null,
        internal2_marks:
          assessmentType === 'internal2'
            ? mark.marks
            : existing.internal2_marks ?? null,
      };
    });

    // Step 3: Upsert with both columns
    const { data, error } = await supabase
      .from('internal_marks')
      .upsert(upsertData, {
        onConflict: 'student_id,subject_id',
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving marks:', error);
    throw error;
  }
};

