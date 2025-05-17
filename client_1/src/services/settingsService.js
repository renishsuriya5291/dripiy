// src/services/settingsService.js
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/user';

// Get user details
const getUser = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data;
};

// Update user profile
const updateUser = async (userData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': userData instanceof FormData ? 'multipart/form-data' : 'application/json',
    },
  };

  const response = await axios.put(API_URL, userData, config);
  
  // Update user in localStorage if email or name changes
  if (response.data && !userData instanceof FormData) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      user.name = response.data.name || user.name;
      user.email = response.data.email || user.email;
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  return response.data;
};

// Update password
const updatePassword = async (passwordData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(`${API_URL}/password`, passwordData, config);
  return response.data;
};

// Update working hours
const updateWorkingHours = async (workingHoursData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(`${API_URL}/working-hours`, workingHoursData, config);
  return response.data;
};


// Update daily limits
const updateDailyLimits = async (limitsData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(`${API_URL}/daily-limits`, limitsData, config);
  return response.data;
};

const settingsService = {
  getUser,
  updateUser,
  updatePassword,
  updateWorkingHours,
  updateDailyLimits,
};

export default settingsService;