import { useState, useEffect } from "react";
import { getSubjects, getFaculties, assignFacultyToSubject } from "../../services/classService";

const AssignFaculties = ({ classId }) => {
    const [subjects, setSubjects] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [assignments, setAssignments] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            setSubjects(await getSubjects(classId));
            setFaculties(await getFaculties());
        };
        fetchData();
    }, [classId]);

    const handleAssign = async (subjectId, facultyId) => {
        await assignFacultyToSubject(subjectId, facultyId);
        setAssignments({ ...assignments, [subjectId]: facultyId });
    };

    return (
        <div>
            <h2 className="text-2xl font-bold">Assign Faculties</h2>
            <table className="w-full border">
                <thead>
                    <tr>
                        <th className="border p-2">Subject</th>
                        <th className="border p-2">Assign Faculty</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((subject) => (
                        <tr key={subject.id} className="border">
                            <td className="border p-2">{subject.name}</td>
                            <td className="border p-2">
                                <select
                                    value={assignments[subject.id] || ""}
                                    onChange={(e) => handleAssign(subject.id, e.target.value)}
                                    className="border p-2"
                                >
                                    <option value="">Select Faculty</option>
                                    {faculties.map((faculty) => (
                                        <option key={faculty.id} value={faculty.id}>
                                            {faculty.name} ({faculty.dept})
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AssignFaculties;
