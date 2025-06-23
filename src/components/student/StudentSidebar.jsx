import Sidebar from "../Sidebar";

const menuItems = [
    { name: "Dashboard", path: "/student-dashboard" },
    { name: "Profile", path: "/student/profile" },
    { name: "Internals", path: "/student/internals" },
    { name: "Assignments", path: "/student/assignment" },
    { name: "Attendence", path: "/student/attendance" }
];

const StudentSidebar = () => <Sidebar role="Student" menuItems={menuItems} />;
export default StudentSidebar;
