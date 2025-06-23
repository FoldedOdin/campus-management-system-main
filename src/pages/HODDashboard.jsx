import { useState, useEffect } from "react";
import { getUsers } from "../services/userService";
import HODSidebar from "../components/hod/HODSidebar";
import { Link } from "react-router-dom";


const HODDashboard = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await getUsers();
            setUsers(data);
        };
        fetchUsers();
    }, []);

    return (
        <div>
            <div className="flex">
            <HODSidebar />
            <div className="flex-1 p-5">
            {/* <h1>HOD Dashboard</h1>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.email} - {user.role}</li>
                ))}
            </ul> */}
                <h1 className="text-3xl font-bold bg-white-500">HOD Dashboard</h1>
                <div className="grid grid-cols-3 text-white gap-5 mt-5">
                    <Link to="/hod/classes" className="p-5 bg-lime-500 text-white rounded">Manage Classes</Link>
                    <Link to="/hod/faculty" className="p-5 bg-lime-500 text-white rounded">Manage Faculty</Link>
                    <Link to="/hod/students" className="p-5 bg-lime-500 text-white rounded">Manage Students</Link>
                </div>
            </div>
        </div>
        </div>
    );
};

export default HODDashboard;
