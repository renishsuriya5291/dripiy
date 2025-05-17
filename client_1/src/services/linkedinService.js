import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/linkedin`;

// Create a custom axios instance with default headers
const linkedinAxios = axios.create({
  baseURL: API_URL
});

// Add request interceptor to include auth token in every request
linkedinAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Get user's LinkedIn accounts
const getAccounts = async () => {
  try {
    const response = await linkedinAxios.get('/accounts');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching LinkedIn accounts:', error);
    throw error;
  }
};

// Connect a LinkedIn account
const connectAccount = async (accountData) => {
  try {
    const response = await linkedinAxios.post('/connect', accountData);
    return response.data;
  } catch (error) {
    console.error('Error connecting LinkedIn account:', error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to connect LinkedIn account. Please try again.');
  }
};

// Delete a LinkedIn account
const deleteAccount = async (accountId) => {
  try {
    const response = await linkedinAxios.delete(`/accounts/${accountId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting LinkedIn account:', error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to delete LinkedIn account. Please try again.');
  }
};

// Test a LinkedIn account connection
const testAccount = async (accountId) => {
  try {
    const response = await linkedinAxios.get(`/accounts/${accountId}/test`);
    return response.data;
  } catch (error) {
    console.error('Error testing LinkedIn account:', error);
    throw error;
  }
};

const linkedinService = {
  getAccounts,
  connectAccount,
  deleteAccount,
  testAccount,
};

export default linkedinService;