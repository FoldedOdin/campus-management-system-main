import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import HODSidebar from "./HODSidebar";

const StudentClassView = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const { data, error } = await supabase
                    .from("classes")
                    .select("id, name")
                    .order("name");
                
                if (error) throw error;
                
                setClasses(data);
                if (data.length > 0) {
                    setSelectedClass(data[0].id); // Set first class as default
                }
            } catch (error) {
                console.error("Error fetching classes:", error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchClasses();
    }, []);

    useEffect(() => {
        const fetchStudentsWithDetails = async () => {
            if (!selectedClass) return;
            
            setLoading(true);
            try {
                // Fetch students for the selected class
                const { data: studentsData, error: studentsError } = await supabase
                    .from("students")
                    .select("id, reg_no, name_of_student, class_id, dept")
                    .eq("class_id", selectedClass);
                
                if (studentsError) throw studentsError;
                
                // For each student, fetch their attendance and marks
                const studentsWithDetails = await Promise.all(
                    studentsData.map(async (student) => {
                        // Fetch attendance
                        const { data: attendanceData } = await supabase
                            .from("attendance")
                            .select("attendance_percentage")
                            .eq("student_id", student.id);
                        
                        const attendance = attendanceData && attendanceData.length > 0 
                            ? attendanceData[0].attendance_percentage 
                            : null;
                        
                        // Fetch internal marks
                        const { data: marksData } = await supabase
                            .from("internal_marks")
                            .select("internal1_marks, internal2_marks, max_marks")
                            .eq("student_id", student.id);
                        
                        const marks = marksData && marksData.length > 0 
                            ? {
                                internal1: marksData[0].internal1_marks,
                                internal2: marksData[0].internal2_marks,
                                maxMarks: marksData[0].max_marks
                              }
                            : null;
                        
                        return {
                            ...student,
                            attendance,
                            marks
                        };
                    })
                );
                
                setStudents(studentsWithDetails);
            } catch (error) {
                console.error("Error fetching student details:", error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchStudentsWithDetails();
    }, [selectedClass]);

    // Calculate average marks from internal exams
    const calculateAverage = (marks) => {
        if (!marks) return "N/A";
        
        const total = (marks.internal1 || 0) + (marks.internal2 || 0);
        const count = (marks.internal1 !== null ? 1 : 0) + (marks.internal2 !== null ? 1 : 0);
        
        if (count === 0) return "N/A";
        return (total / count).toFixed(1);
    };

    return (
        <div className="flex">
            <HODSidebar />
            <div className="p-5 w-full">
                <h2 className="text-2xl font-bold">Student Performance Dashboard</h2>

                {/* Class Selection Dropdown */}
                <div className="mt-4">
                    <label className="block font-semibold mb-1">Select Class:</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="border p-2 rounded-md w-64"
                        disabled={loading || classes.length === 0}
                    >
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Students Table */}
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-3">
                        {classes.find(c => c.id === selectedClass)?.name || "Class"} - Student Performance
                    </h3>
                    
                    {loading ? (
                        <p>Loading student data...</p>
                    ) : students.length === 0 ? (
                        <p>No students found for this class.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 text-black">
                                        <th className="border p-3 text-left">Reg No</th>
                                        <th className="border p-3 text-left">Name</th>
                                        <th className="border p-3 text-left">Department</th>
                                        <th className="border p-3 text-center">Internal 1</th>
                                        <th className="border p-3 text-center">Internal 2</th>
                                        <th className="border p-3 text-center">Average</th>
                                        <th className="border p-3 text-center">Attendance (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student.id} className="">
                                            <td className="border p-3">{student.reg_no}</td>
                                            <td className="border p-3">{student.name_of_student}</td>
                                            <td className="border p-3">{student.dept}</td>
                                            <td className="border p-3 text-center">
                                                {student.marks?.internal1 ?? "N/A"}
                                                {student.marks?.maxMarks ? ` / ${student.marks.maxMarks}` : ""}
                                            </td>
                                            <td className="border p-3 text-center">
                                                {student.marks?.internal2 ?? "N/A"}
                                                {student.marks?.maxMarks ? ` / ${student.marks.maxMarks}` : ""}
                                            </td>
                                            <td className="border p-3 text-center">
                                                {calculateAverage(student.marks)}
                                            </td>
                                            <td className="border p-3 text-center">
                                                {student.attendance !== null ? `${student.attendance}%` : "N/A"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentClassView;