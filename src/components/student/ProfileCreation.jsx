// src/components/student/ProfileCreation.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import StudentSidebar from './StudentSidebar';

const ProfileCreation = () => {
  const [profileData, setProfileData] = useState({
    reg_no: '',
    name_of_student: '',
    class_name: '',
    dept: '',
    email: '',
    ph_no: '',
    addr: '',
    date_of_birth: ''
  });

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Fetch current user and profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Fetch student profile data
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            setProfileData({
              reg_no: data.reg_no || '',
              name_of_student: data.name_of_student || '',
              class_name: data.class_name || '',
              dept: data.dept || '',
              email: data.email || user.email || '',
              ph_no: data.ph_no || '',
              addr: data.addr || '',
              date_of_birth: data.date_of_birth || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      setLoading(true);
  
      const { error } = await supabase
        .from('students')
        .update({
          ph_no: profileData.ph_no,
          addr: profileData.addr
        })
        .eq('reg_no', profileData.reg_no); // Use reg_no instead of id
  
      if (error) throw error;
  
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };  
  

  if (loading) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 p-8">
          <div className="text-center">Loading profile data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto bg-grey rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-white-800">Student Profile</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Non-editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white-700">Registration Number</label>
                <input
                  type="text"
                  value={profileData.reg_no}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white-700">Full Name</label>
                <input
                  type="text"
                  value={profileData.name_of_student}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white-700">Class</label>
                <input
                  type="text"
                  value={profileData.class_name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white-700">Department</label>
                <input
                  type="text"
                  value={profileData.dept}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white-700">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white-700">Date of Birth</label>
                <input
                  type="text"
                  value={profileData.date_of_birth}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-black-100 p-2"
                  readOnly
                />
              </div>
            </div>
            
            {/* Editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  name="ph_no"
                  value={profileData.ph_no}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  title="Please enter a 10-digit phone number"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="addr"
                  value={profileData.addr}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  rows="3"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileCreation;