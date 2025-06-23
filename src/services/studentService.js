// src/services/studentService.js
import { supabase, supabaseAdmin } from "./supabase";

export const addStudent = async (studentData, batchCoordinatorId) => {
    try {
        const { reg_no, name_of_student, date_of_birth } = studentData;
        
        // Generate email and password
        const studentEmail = `${reg_no.toLowerCase()}@sngist.org`;
        const initialPassword = date_of_birth.split('-').reverse().join('');

        // Step 1: Check if student exists
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", studentEmail)
            .single();

        if (existingUser) {
            throw new Error("Student with this registration number already exists.");
        }

        // Step 2: Get batch coordinator's department
        const { data: coordinatorData, error: coordinatorError } = await supabase
            .from("faculty")
            .select("dept")
            .eq("id", batchCoordinatorId)
            .single();

        if (coordinatorError || !coordinatorData) {
            throw new Error("Batch coordinator information not found");
        }

        const department = coordinatorData.dept;

        // Step 3: Get class information
        const { data: classData, error: classError } = await supabase
            .from("classes")
            .select("*")
            .eq("batch_coordinator_id", batchCoordinatorId)
            .single();

        if (classError || !classData) {
            throw new Error("Class information not found for this coordinator");
        }

        // Step 4: Create auth user
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: studentEmail,
            password: initialPassword,
            user_metadata: { 
                role: "Student",
                name: name_of_student,
                reg_no: reg_no
            },
            email_confirm: true,
        });

        if (authError) throw new Error("Auth error: " + authError.message);

        const userId = user?.user?.id;
        if (!userId) throw new Error("User ID not returned.");

        // Step 5: Insert into users table
        const { error: usersInsertError } = await supabase
            .from("users")
            .insert([{ 
                id: userId,
                email: studentEmail,
                full_name: name_of_student,
                role: "Student",
                class_id: classData.id,
                department: department, // Using coordinator's department
                created_at: new Date().toISOString()
            }]);

        if (usersInsertError) throw new Error("Users insert error: " + usersInsertError.message);

        // Step 6: Insert into students table
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert([{ 
                id: userId,
                reg_no,
                name_of_student,
                class_id: classData.id,
                class_name: classData.name,
                dept: department, // Using coordinator's department
                email: studentEmail,
                date_of_birth,
                batch_coordinator_id: batchCoordinatorId
            }])
            .select();

        if (studentError) throw new Error("Student insert error: " + studentError.message);

        return { 
            success: true, 
            student: student[0],
            initialPassword: initialPassword,
            studentEmail: studentEmail
        };
    } catch (error) {
        console.error("Error adding student:", error.message);
        return { success: false, error: error.message };
    }
};

export const getStudentsByCoordinator = async (batchCoordinatorId) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .eq("batch_coordinator_id", batchCoordinatorId)
            .order("name_of_student", { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching students:", error.message);
        return [];
    }
};