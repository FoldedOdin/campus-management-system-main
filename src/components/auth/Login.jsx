import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import background from '../../assets/background.jpg'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
  
    try {
      // Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
  
      if (authError) throw authError
  
      // Fetch user role
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle()
  
      if (roleError) throw roleError
      if (!userData) {
        setError('User not found. Please register first.')
        return
      }
  
      // Check if faculty is a batch coordinator
      if (userData.role === 'Faculty') {
        const { data: facultyData, error: facultyError } = await supabase
          .from('faculty')
          .select('id')
          .eq('email', email)
          .maybeSingle()
  
        if (facultyError) throw facultyError
  
        if (facultyData) {
          const { data: batchCoordinatorData, error: batchError } = await supabase
            .from('classes')
            .select('*')
            .eq('batch_coordinator_id', facultyData.id)
  
          if (batchError) throw batchError
  
          // If faculty is a batch coordinator, redirect to batch coordinator dashboard
          if (batchCoordinatorData && batchCoordinatorData.length > 0) {
            navigate('/batch-coordinator-dashboard')
            return
          }
        }
      }
  
      // Redirect based on role
      if (userData.role === 'HOD') {
        navigate('/hod-dashboard')
      } else if (userData.role === 'Faculty') {
        navigate('/faculty-dashboard')
      } else if (userData.role === 'Student') {
        navigate('/student-dashboard')
      } else {
        setError('Access denied. You are not authorized.')
      }
      
    } catch (err) {
      setError(err.message || 'Login failed')
      console.error('Login error:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat w-screen h-screen" 
    style={{ backgroundImage: `url(${background})` }}>
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-black">Login</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-black font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-black focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-black font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-black focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
