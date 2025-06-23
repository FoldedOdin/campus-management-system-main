// src/pages/StudentProfileUpdate.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const StudentProfileUpdate = () => {
  const [profile, setProfile] = useState({ addr: '', ph_no: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('students')
        .select('addr, ph_no')
        .eq('auth_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load profile:', error.message);
        alert('Failed to load profile.');
      } else {
        setProfile(data || { addr: '', ph_no: '' });
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('students')
      .update({
        addr: profile.addr,
        ph_no: profile.ph_no,
      })
      .eq('auth_id', user.id);

    if (error) {
      console.error('Failed to update profile:', error.message);
      alert('Failed to update profile. Please try again.');
    } else {
      alert('Profile updated successfully!');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading profile data...</div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Update Profile</h2>
      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Phone Number</label>
          <input
            type="text"
            name="ph_no"
            value={profile.ph_no}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter phone number"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Address</label>
          <textarea
            name="addr"
            value={profile.addr}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter address"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default StudentProfileUpdate;
