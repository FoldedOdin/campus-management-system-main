import Sidebar from "../Sidebar";

const menuItems = [
    { name: "Dashboard", path: "/hod-dashboard" },
    { name: "Classes", path: "/hod/classes" },
    { name: "Faculty", path: "/hod/faculty" },
    { name: "Show Faculty", path: "/hod/showfaculty" },
    { name: "Students", path: "/hod/students" }
];

const HODSidebar = () => <Sidebar role="HOD" menuItems={menuItems} />;
export default HODSidebar;
