import { supabase, supabaseAdmin } from "./supabase";

// ✅ GET all faculty
export const getFaculty = async () => {
    const { data, error } = await supabase.from("faculty").select("*");
    if (error) {
        console.error("Error fetching faculty:", error.message);
        return [];
    }
    return data;
};

// ✅ TOGGLE faculty active/inactive
export const toggleFacultyStatus = async (id, newStatus) => {
    const { error } = await supabase
        .from("faculty")
        .update({ activeStatus: newStatus })
        .eq("id", id);
    if (error) console.error("Error updating faculty status:", error.message);
};

// ✅ ADD faculty (with validation and inserts into auth, users, faculty)
export const addFaculty = async (facultyData) => {
    try {
        const { name, email, phone, dept } = facultyData;
        const initialPassword = "faculty@123";

        // Validate phone
        const phonePattern = /^\d{10}$/;
        if (!phonePattern.test(phone)) {
            throw new Error("Enter a valid 10-digit mobile number.");
        }

        // Validate other fields
        if (!name?.trim()) throw new Error("Name cannot be empty.");
        if (!email?.includes("@") || !email?.includes(".")) throw new Error("Invalid email.");
        if (!dept?.trim()) throw new Error("Department cannot be empty.");

        // Check if email already exists in users table
        const { data: existingUser, error: userCheckError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (userCheckError && userCheckError.code !== 'PGRST116') {
            throw new Error("User check error: " + userCheckError.message);
        }

        if (existingUser) throw new Error("User with this email already exists.");

        // Create user in Supabase Auth
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: initialPassword,
            user_metadata: { role: "Faculty", name, phone, dept },
            email_confirm: true,
        });

        if (authError) throw new Error("Auth error: " + authError.message);
        const userId = user?.user?.id;
        if (!userId) throw new Error("User ID not returned.");

        // Insert into users table
        const { error: usersInsertError } = await supabase
            .from("users")
            .insert([{
                id: userId,
                email,
                full_name: name,
                role: "Faculty",
                department: dept,
                created_at: new Date().toISOString(),
            }]);

        if (usersInsertError) throw new Error("Users insert error: " + usersInsertError.message);

        // Insert into faculty table
        const { data: faculty, error: facultyError } = await supabase
            .from("faculty")
            .insert([{
                id: userId,
                name,
                email,
                phone,
                dept,
                activeStatus: true,
            }])
            .select();

        if (facultyError) throw new Error("Faculty insert error: " + facultyError.message);

        return {
            success: true,
            faculty: faculty[0],
            initialPassword: initialPassword
        };
    } catch (error) {
        console.error("Error adding faculty:", error.message);
        return { success: false, error: error.message };
    }
};
