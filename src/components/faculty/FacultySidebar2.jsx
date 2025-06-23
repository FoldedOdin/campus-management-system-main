import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { path: '/marks-entry', label: 'Marks Entry', icon: 'fas fa-edit' },
    { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
    { path: '/students', label: 'Students', icon: 'fas fa-user-graduate' },
    { path: '/subjects', label: 'Subjects', icon: 'fas fa-book' },
    { path: '/profile', label: 'Profile', icon: 'fas fa-user-circle' },
  ];

  return (
    <div className="h-screen w-64 bg-blue-800 text-white flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-blue-600">
        Faculty Portal
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link 
                to={item.path}
                className={`flex items-center px-4 py-3 hover:bg-blue-700 ${
                  location.pathname === item.path ? 'bg-blue-900' : ''
                }`}
              >
                <i className={`${item.icon} mr-3`}></i>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-blue-600">
        <button className="flex items-center text-sm w-full">
          <i className="fas fa-sign-out-alt mr-3"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;