import { supabase } from "./supabase";

// Get all subjects
export const getAllSubjects = async () => {
    try {
        const { data, error } = await supabase
            .from("subjects")
            .select("*")
            .order("name");
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching subjects:", error.message);
        return [];
    }
};

// Get subjects for a specific faculty
export const getSubjectsByFaculty = async (facultyId) => {
    try {
        const { data, error } = await supabase
            .from("subjects")
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
            .eq("faculty_id", facultyId);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching faculty subjects:", error.message);
        return [];
    }
};

// Get subjects for a specific class
export const getSubjectsByClass = async (classId) => {
    try {
        const { data, error } = await supabase
            .from("subjects")
            .select(`
                id, 
                name,
                faculty_id,
                faculty (
                    id,
                    name,
                    email
                )
            `)
            .eq("class_id", classId);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching class subjects:", error.message);
        return [];
    }
};

// Get students with performance data (marks and attendance) for a class
export const getStudentPerformanceByClass = async (classId) => {
    try {
        // First get all students in the class
        const { data: students, error: studentsError } = await supabase
            .from("students")
            .select("id, reg_no, name_of_student, dept")
            .eq("class_id", classId);
            
        if (studentsError) throw studentsError;
        
        // For each student, get their marks and attendance
        const studentsWithPerformance = await Promise.all(
            students.map(async (student) => {
                // Get attendance data
                const { data: attendanceData } = await supabase
                    .from("attendance")
                    .select("cumulative_attendace, subject_id")
                    .eq("student_id", student.id);
                
                // Get marks data
                const { data: marksData } = await supabase
                    .from("internal_marks")
                    .select("subject_id, internal1_marks, internal2_marks, max_marks")
                    .eq("student_id", student.id);
                    
                return {
                    ...student,
                    attendance: attendanceData || [],
                    marks: marksData || []
                };
            })
        );
        
        return studentsWithPerformance;
    } catch (error) {
        console.error("Error fetching student performance:", error.message);
        return [];
    }
};

// Get classes
export const getAllClasses = async () => {
    try {
        const { data, error } = await supabase
            .from("classes")
            .select(`
                id, 
                name, 
                batch_year_start, 
                batch_year_end, 
                batch_coordinator_id, 
                batch_coordinator_name
            `)
            .order("batch_year_start", { ascending: false });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching classes:", error.message);
        return [];
    }
};

// Get a single class with coordinator details
export const getClassDetails = async (classId) => {
    try {
        const { data, error } = await supabase
            .from("classes")
            .select(`
                id, 
                name, 
                batch_year_start, 
                batch_year_end, 
                batch_coordinator_id, 
                batch_coordinator_name
            `)
            .eq("id", classId)
            .single();
            
        if (error) throw error;
        
        // Get coordinator details if available
        if (data.batch_coordinator_id) {
            const { data: coordinatorData, error: coordinatorError } = await supabase
                .from("faculty")
                .select("name, email, phone, dept")
                .eq("id", data.batch_coordinator_id)
                .single();
                
            if (!coordinatorError) {
                data.coordinator = coordinatorData;
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error fetching class details:", error.message);
        return null;
    }
};