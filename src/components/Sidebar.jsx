import { Link } from "react-router-dom";

const Sidebar = ({ role, menuItems }) => {
    return (
        <div className="h-screen w-64 bg-gray-900 text-white flex flex-col">
            <h2 className="text-2xl font-bold p-5">{role} Dashboard</h2>
            <nav className="flex-1">
                {menuItems.map((item) => (
                    <Link key={item.name} to={item.path} className="block p-3 hover:bg-gray-700">
                        {item.name}
                    </Link>
                ))}
            </nav>
            <Link to="/logout" className="block p-3 bg-red-600 hover:bg-red-700 text-center">
                Logout
            </Link>
        </div>
    );
};

export default Sidebar;
