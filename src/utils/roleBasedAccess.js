// utils/roleBasedAccess.js
export const ROLES = {
    STUDENT: 'student',
    FACULTY: 'faculty',
    BATCH_COORDINATOR: 'batch_coordinator',
    HEAD_OF_DEPARTMENT: 'hod'
  };
  
  export const checkAccess = (userRole, requiredRoles) => {
    return requiredRoles.includes(userRole);
  };