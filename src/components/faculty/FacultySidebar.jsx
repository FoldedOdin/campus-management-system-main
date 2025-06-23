import Sidebar from "../Sidebar";

const menuItems = [
    { name: "Dashboard", path: "/faculty-dashboard" },
    { name: "Classes", path: "/faculty/classes" },
    { name: "Marks", path: "/faculty/marks" },
    { name: "Assignment", path: "/faculty/assignment" },
    { name: "Attendance", path: "/faculty/attendance" },
    { name: "Students", path: "/faculty/students" }
];

const FacultySidebar = () => <Sidebar role="Faculty" menuItems={menuItems} />;
export default FacultySidebar;
