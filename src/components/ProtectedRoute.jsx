import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth()

  // Still loading
  if (loading) {
    return <div>Loading...</div>
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Role-based access control
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Render child routes
  return <Outlet />
}

export default ProtectedRoute