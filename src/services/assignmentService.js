// assignmentService.js
import { supabase } from "./supabase";

export const getFacultySubjects = async (facultyId) => {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select(`
                id,
                name,
                class_id,
                classes (id, name)
            `)
            .eq('faculty_id', facultyId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching faculty subjects:", error.message);
        return [];
    }
};

export const getClassAssignments = async (classId, facultyId) => {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('class_id', classId)
            .eq('created_by', facultyId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching assignments:", error.message);
        return [];
    }
};

export const getAssignmentSubmissions = async (classId) => {
    try {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .select(`
                *,
                students (id, name_of_student)
            `)
            .eq('class_id', classId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching submissions:", error.message);
        return [];
    }
};

export const createAssignment = async (assignmentData) => {
    try {
        // First ensure we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            throw new Error("Session expired. Please login again.");
        }

        // Insert the assignment
        const { data: assignmentData, error: assignmentError } = await supabase
            .from('assignments')
            .insert({
                created_by: session.user.id,
                ...assignmentData
            })
            .select();

        if (assignmentError) throw assignmentError;

        return { success: true, assignment: assignmentData[0] };
    } catch (error) {
        console.error("Assignment creation error:", error.message);
        return { success: false, error: error.message };
    }
};

export const createInitialSubmissions = async (assignmentId, classId, subjectName) => {
    try {
        // Get all students in the class
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', classId);

        if (studentsError) throw studentsError;

        if (students && students.length > 0) {
            const submissionRecords = students.map(student => ({
                assignment_id: assignmentId,
                student_id: student.id,
                subject_name: subjectName,
                class_id: classId,
                status: false,
                score: null
            }));

            const { error: submissionError } = await supabase
                .from('assignment_submissions')
                .insert(submissionRecords);

            if (submissionError) throw submissionError;
        }

        return { success: true };
    } catch (error) {
        console.error("Error creating initial submissions:", error.message);
        return { success: false, error: error.message };
    }
};

export const updateSubmissionStatus = async (submissionId, status) => {
    try {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .update({ status })
            .eq('id', submissionId)
            .select();

        if (error) throw error;
        return { success: true, submission: data[0] };
    } catch (error) {
        console.error("Error updating submission:", error.message);
        return { success: false, error: error.message };
    }
};

export const bulkUpdateSubmissionStatus = async (updates) => {
    try {
        const updatePromises = updates.map(update => 
            supabase
                .from('assignment_submissions')
                .update({ status: update.status })
                .eq('id', update.submissionId)
        );

        const results = await Promise.all(updatePromises);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
            throw new Error(`Failed to update ${errors.length} submissions`);
        }

        return { success: true, updatedCount: updates.length };
    } catch (error) {
        console.error("Error bulk updating submissions:", error.message);
        return { success: false, error: error.message };
    }
};