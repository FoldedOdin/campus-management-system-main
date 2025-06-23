import { useState, useEffect } from "react";
import {
    getFaculty,
    toggleFacultyStatus,
    addFaculty,
} from "../../services/facultyService";
import HODSidebar from "./HODSidebar";

const FacultyManagement = () => {
    const [faculty, setFaculty] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [initialPassword, setInitialPassword] = useState("");
    const [newFaculty, setNewFaculty] = useState({
        name: "",
        email: "",
        phone: "",
        dept: "",
        activeStatus: true,
    });

    useEffect(() => {
        const fetchFaculty = async () => {
            const data = await getFaculty();
            setFaculty(data);
        };
        fetchFaculty();
    }, []);

    const handleToggleStatus = async (id, status) => {
        await toggleFacultyStatus(id, !status);
        setFaculty(await getFaculty());
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewFaculty({ ...newFaculty, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const result = await addFaculty(newFaculty);

        if (result.success) {
            setInitialPassword(result.initialPassword);
            setShowForm(false);
            setShowPasswordModal(true);
            setFaculty(await getFaculty());
        } else {
            alert(result.error);
        }
    };

    const handlePasswordModalClose = () => {
        setShowPasswordModal(false);
        setInitialPassword("");
    };

    return (
        <div className="flex">
            <HODSidebar />
            <div className="p-5 w-full">
                <h2 className="text-2xl font-bold">Faculty Management</h2>
                <button
                    className="bg-blue-600 text-white px-4 py-2 mt-3 rounded-md"
                    onClick={() => setShowForm(true)}
                >
                    Add Faculty
                </button>

                <h5 className="text-2xl font-bold mt-5">Assigned Faculties</h5>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-black-200">
                                <th className="border p-3">Name</th>
                                <th className="border p-3">Email</th>
                                <th className="border p-3">Phone</th>
                                <th className="border p-3">Department</th>
                                <th className="border p-3">Status</th>
                                <th className="border p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faculty.map((f) => (
                                <tr key={f.id} className="border">
                                    <td className="border p-3">{f.name}</td>
                                    <td className="border p-3">{f.email}</td>
                                    <td className="border p-3">{f.phone}</td>
                                    <td className="border p-3">{f.dept}</td>
                                    <td className="border p-3">
                                        {f.activeStatus ? "Active" : "Inactive"}
                                    </td>
                                    <td className="border p-3">
                                        <button
                                            onClick={() =>
                                                handleToggleStatus(f.id, f.activeStatus)
                                            }
                                            className={`px-3 py-1 text-white rounded-md ${
                                                f.activeStatus
                                                    ? "bg-red-500"
                                                    : "bg-green-500"
                                            }`}
                                        >
                                            {f.activeStatus
                                                ? "Deactivate"
                                                : "Activate"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Faculty Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-black p-5 rounded-md">
                            <h3 className="text-xl font-bold">Add Faculty</h3>
                            <form onSubmit={handleSubmit} className="mt-4">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    className="border p-2 w-full mb-2"
                                    value={newFaculty.name}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    className="border p-2 w-full mb-2"
                                    value={newFaculty.email}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Phone"
                                    className="border p-2 w-full mb-2"
                                    value={newFaculty.phone}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    type="text"
                                    name="dept"
                                    placeholder="Department"
                                    className="border p-2 w-full mb-2"
                                    value={newFaculty.dept}
                                    onChange={handleInputChange}
                                    required
                                />
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 mt-3 rounded-md w-full"
                                >
                                    Submit
                                </button>
                                <button
                                    type="button"
                                    className="bg-red-500 text-white px-4 py-2 mt-3 rounded-md w-full"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Initial Password Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-black p-5 rounded-md text-center">
                            <h3 className="text-xl font-bold mb-4">
                                Faculty Added Successfully
                            </h3>
                            <p className="mb-4">
                                Initial Password:{" "}
                                <strong>{initialPassword}</strong>
                            </p>
                            <p className="mb-4 text-red-500">
                                Please ask the faculty to change this password
                                upon first login.
                            </p>
                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-md"
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

export default FacultyManagement;
