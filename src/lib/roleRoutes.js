export const getHomeRouteForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'chairman') return '/chairman';
  if (role === 'staff_coordinator') return '/events/management';
  return '/student/home';
};
