import { supabase } from "./supabase";

export const getStudents = async () => {
    const { data, error } = await supabase.from("students").select("*");
    if (error) throw error;
    return data;
};
export const getClassesForCoordinator = async () => {
    const user = supabase.auth.user();
    const { data, error } = await supabase.from("classes").select("*").eq("batch_coordinator_id", user.id);
    if (error) throw error;
    return data;
};

export const addStudent = async (student) => {
    const { error } = await supabase.from("students").insert([student]);
    if (error) throw error;

    // Add student to users table with role 'Student'
    await supabase.from("users").insert([{ email: `${student.reg_no}@school.com`, password: student.initial_password, role: "Student" }]);
};