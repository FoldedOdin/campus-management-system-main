import { supabase, supabaseAdmin } from "./supabase";

// Fetch all classes
export const getClasses = async () => {
    const { data, error } = await supabase
        .from("classes")
        .select("*");

    if (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
    return data;
};

// Fetch all faculties
export const getFaculties = async () => {
    try {
        const { data, error } = await supabase
            .from("faculty")
            .select("*");

        if (error) {
            console.error("Error fetching faculties:", error);
            return [];
        }

        // Log the fetched faculties for debugging
        console.log('Fetched Faculties:', data);
        return data;
    } catch (catchError) {
        console.error('Unexpected error in getFaculties:', catchError);
        return [];
    }
};

// Add a new class
export const addClass = async (classData) => {
    const { data, error } = await supabase
        .from("classes")
        .insert([classData])
        .select();

    if (error) {
        console.error("Error adding class:", error);
        return null;
    }
    return data[0];
};

// Add a new subject to a class
export const addSubject = async (subjectData) => {
    const { data, error } = await supabase
        .from("subjects")
        .insert([subjectData])
        .select();

    if (error) {
        console.error("Error adding subject:", error);
        return null;
    }
    return data[0];
};

// Fetch subjects for a specific class
export const getSubjectsByClass = async (classId) => {
    const { data, error } = await supabase
        .from("subjects")
        .select(`
            *,
            faculty (id, name, dept)
        `)
        .eq("class_id", classId);

    if (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
    return data;
};

// Assign faculty to a subject
export const assignFacultyToSubject = async (subjectId, facultyId) => {
    const { data, error } = await supabase
        .from("subjects")
        .update({ faculty_id: facultyId })
        .eq("id", subjectId)
        .select();

    if (error) {
        console.error("Error assigning faculty:", error);
        return null;
    }
    
    // Fetch the updated subject with faculty data
    const { data: updatedData, error: fetchError } = await supabase
        .from("subjects")
        .select(`
            *,
            faculty (id, name, dept)
        `)
        .eq("id", subjectId)
        .single();
        
    if (fetchError) {
        console.error("Error fetching updated subject:", fetchError);
        return data[0]; // Return basic data without faculty info
    }
    
    return updatedData;
};

// Delete a subject
export const deleteSubject = async (subjectId) => {
    const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);

    if (error) {
        console.error("Error deleting subject:", error);
        return false;
    }
    return true;
};

// Delete a class
export const deleteClass = async (classId) => {
    const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

    if (error) {
        console.error("Error deleting class:", error);
        return false;
    }
    return true;
};