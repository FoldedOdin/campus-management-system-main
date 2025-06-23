// src/components/batch-coordinator/StudentRegistration.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '../../services/supabase';
import { addStudent, getStudentsByCoordinator } from "../../services/studentService";
import BatchcoordiantorSidebar from "../batch-coordinator/BatchcoordinatorSidebar";

const StudentRegistration = () => {
    const [students, setStudents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [initialCredentials, setInitialCredentials] = useState({
        password: "",
        email: ""
    });
    const [newStudent, setNewStudent] = useState({
        reg_no: "",
        name_of_student: "",
        date_of_birth: ""
    });
    const [currentBatchCoordinator, setCurrentBatchCoordinator] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchData = async () => {
        try {
            // Get current user (batch coordinator)
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError) throw authError;
            if (!user) throw new Error("No authenticated user");
    
            // Get faculty information to get the faculty ID and department
            const { data: facultyData, error: facultyError } = await supabase
                .from('faculty')
                .select('id, dept')
                .eq('email', user.email)
                .single();
    
            if (facultyError || !facultyData) {
                throw new Error("Faculty information not found");
            }
    
            setCurrentBatchCoordinator(facultyData.id);
            const data = await getStudentsByCoordinator(facultyData.id);
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Failed to load student data: " + error.message);
        }
    };

        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewStudent({ ...newStudent, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate date format
            if (!newStudent.date_of_birth.match(/^\d{4}-\d{2}-\d{2}$/)) {
                throw new Error("Date of birth must be in YYYY-MM-DD format");
            }

            const result = await addStudent(newStudent, currentBatchCoordinator);
            
            if (result.success) {
                setInitialCredentials({
                    password: result.initialPassword,
                    email: result.studentEmail
                });
                setShowForm(false);
                setShowPasswordModal(true);
                setStudents(await getStudentsByCoordinator(currentBatchCoordinator));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordModalClose = () => {
        setShowPasswordModal(false);
        setInitialCredentials({ password: "", email: "" });
    };

    return (
        <div className="flex">
            <BatchcoordiantorSidebar />
            <div className="p-5 w-full">
                <h2 className="text-2xl font-bold">Student Registration</h2>
                <button
                    className="bg-blue-600 text-white px-4 py-2 mt-3 rounded-md hover:bg-blue-700 transition"
                    onClick={() => setShowForm(true)}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Register Student"}
                </button>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-3">
                        {error}
                    </div>
                )}

                <h5 className="text-2xl font-bold mt-5">Registered Students</h5>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-black-200">
                                <th className="border p-3">Reg. No</th>
                                <th className="border p-3">Student Name</th>
                                <th className="border p-3">Class</th>
                                <th className="border p-3">Department</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id} className="border">
                                    <td className="border p-3">{student.reg_no}</td>
                                    <td className="border p-3">{student.name_of_student}</td>
                                    <td className="border p-3">{student.class_name}</td>
                                    <td className="border p-3">{student.dept}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Student Registration Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center bg-grey bg-opacity-50">
                        <div className="bg-black p-5 rounded-md w-96">
                            <h3 className="text-xl font-bold mb-4">Register Student</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1">Registration Number</label>
                                    <input
                                        type="text"
                                        name="reg_no"
                                        placeholder="SGI22CS001"
                                        className="w-full p-2 border rounded"
                                        value={newStudent.reg_no}
                                        onChange={handleInputChange}
                                        required
                                        pattern="[A-Za-z0-9]+"
                                        title="Alphanumeric characters only"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1">Student Name</label>
                                    <input
                                        type="text"
                                        name="name_of_student"
                                        placeholder="Full Name"
                                        className="w-full p-2 border rounded"
                                        value={newStudent.name_of_student}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        className="w-full p-2 border rounded"
                                        value={newStudent.date_of_birth}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md flex-1 hover:bg-blue-700 transition"
                                        disabled={loading}
                                    >
                                        {loading ? "Registering..." : "Register"}
                                    </button>
                                    <button
                                        type="button"
                                        className="bg-gray-500 text-white px-4 py-2 rounded-md flex-1 hover:bg-gray-600 transition"
                                        onClick={() => setShowForm(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Initial Password Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-grey bg-opacity-50">
                        <div className="bg-black p-5 rounded-md text-center w-96">
                            <h3 className="text-xl font-bold mb-4">Student Registered Successfully</h3>
                            <div className="bg-gray text-black-100 p-4 rounded mb-4">
                                <p className="font-semibold">Initial Login Details:</p>
                                <p>Email: <strong>{initialCredentials.email}</strong></p>
                                <p>Password: <strong>{initialCredentials.password}</strong></p>
                            </div>
                            <p className="mb-4 text-sm text-red-500">
                                Password is the student's date of birth in DDMMYYYY format.
                                Ask them to change it after first login.
                            </p>
                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-md w-full hover:bg-blue-700 transition"
                                onClick={handlePasswordModalClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentRegistration;