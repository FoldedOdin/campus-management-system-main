import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import HODSidebar from "./HODSidebar";

const FacultySubjectAssignment = () => {
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState("");
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        const fetchFacultiesWithSubjects = async () => {
            setLoading(true);
            try {
                // Fetch all faculties
                const { data: facultyData, error: facultyError } = await supabase
                    .from("faculty")
                    .select("id, name, email, phone, dept, activeStatus")
                    .order("name");
                
                if (facultyError) throw facultyError;
                
                // Get unique departments
                const deptSet = new Set(facultyData.map(fac => fac.dept));
                setDepartments(Array.from(deptSet));
                
                // For each faculty, fetch their subjects and classes
                const facultiesWithSubjects = await Promise.all(
                    facultyData.map(async (faculty) => {
                        // Fetch subjects assigned to this faculty
                        const { data: subjectsData, error: subjectsError } = await supabase
                            .from("subjects")
                            .select(`
                                id, 
                                name,
                                classes (
                                    id,
                                    name
                                )
                            `)
                            .eq("faculty_id", faculty.id);
                        
                        if (subjectsError) {
                            console.error(`Error fetching subjects for faculty ${faculty.id}:`, subjectsError.message);
                            return {
                                ...faculty,
                                subjects: []
                            };
                        }
                        
                        // Get batch coordinator info
                        const { data: coordinatorData } = await supabase
                            .from("classes")
                            .select("name")
                            .eq("batch_coordinator_id", faculty.id);
                        
                        const coordinatorClasses = coordinatorData || [];
                        
                        return {
                            ...faculty,
                            subjects: subjectsData || [],
                            isCoordinator: coordinatorClasses.length > 0,
                            coordinatorClasses: coordinatorClasses
                        };
                    })
                );
                
                setFaculties(facultiesWithSubjects);
            } catch (error) {
                console.error("Error fetching faculty data:", error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFacultiesWithSubjects();
    }, []);

    // Filter faculties by department
    const filteredFaculties = filterDept 
        ? faculties.filter(faculty => faculty.dept === filterDept)
        : faculties;

    return (
        <div className="flex">
            <HODSidebar />
            <div className="p-5 w-full">
                <h2 className="text-2xl font-bold">Faculty Subject Assignments</h2>

                {/* Department Filter */}
                <div className="mt-4">
                    <label className="block font-semibold mb-1">Filter by Department:</label>
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="border p-2 rounded-md w-64"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Faculty List */}
                <div className="mt-6">
                    {loading ? (
                        <p>Loading faculty data...</p>
                    ) : filteredFaculties.length === 0 ? (
                        <p>No faculty members found.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredFaculties.map((faculty) => (
                                <div 
                                    key={faculty.id} 
                                    className={`border rounded-lg shadow-sm p-4 ${!faculty.activeStatus ? 'bg-gray-100' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {faculty.name}
                                                {!faculty.activeStatus && <span className="ml-2 text-sm text-red-500">(Inactive)</span>}
                                            </h3>
                                            <p className="text-gray-600">{faculty.dept}</p>
                                            <p className="text-sm text-gray-500">{faculty.email} • {faculty.phone}</p>
                                            
                                            {faculty.isCoordinator && (
                                                <div className="mt-2">
                                                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                                        Batch Coordinator: {faculty.coordinatorClasses.map(c => c.name).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="font-medium">Assigned Subjects & Classes:</h4>
                                        {faculty.subjects.length === 0 ? (
                                            <p className="text-sm text-gray-500 mt-1">No subjects assigned</p>
                                        ) : (
                                            <ul className="mt-2 space-y-2">
                                                {faculty.subjects.map((subject) => (
                                                    <li key={subject.id} className="pl-2 border-l-2 border-gray-300">
                                                        <span className="font-medium">{subject.name}</span>
                                                        <div className="text-sm text-gray-600 ml-2">
                                                            {subject.classes ? (
                                                                `Class: ${subject.classes.name}`
                                                            ) : (
                                                                "No class assigned"
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacultySubjectAssignment;