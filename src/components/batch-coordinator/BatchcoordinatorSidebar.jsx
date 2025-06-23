import Sidebar from "../Sidebar";

const menuItems = [
    { name: "Dashboard", path: "/batch-coordinator-dashboard" },
    { name: "Manage Student", path: "/batch-coordinator/student-registration" },
    { name: "Marks", path: "/batch-coordinator/marks" },
    { name: "Assignment", path: "/batch-coordinator/assignment" },
    { name: "Attendence", path: "/batch-coordinator/attendance" }
];

const BatchcoordinatorSidebar = () => <Sidebar role="Batch coordinator" menuItems={menuItems} />;
export default BatchcoordinatorSidebar;
