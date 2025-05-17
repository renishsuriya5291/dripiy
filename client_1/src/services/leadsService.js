// src/services/leadsService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


// Create new lead list
const createLeadList = async (listData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(`${API_URL}/leadlists`, listData, config);
  return response.data;
};

// Get all lead lists
const getLeadLists = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/leadlists`, config);
  return response.data;
};

// Get single lead list
const getLeadList = async (listId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/leadlists/${listId}`, config);
  return response.data;
};

// Delete lead list
const deleteLeadList = async (listId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.delete(`${API_URL}/leadlists/${listId}`, config);
  return response.data;
};

// Import leads from CSV
const importLeadsFromCSV = async (file, leadListId, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('leadListId', leadListId);

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  };

  const response = await axios.post(
    `${API_URL}/leadlists/${leadListId}/import-csv`,
    formData,
    config
  );
  return response.data;
};

// Search leads from LinkedIn
const searchLeadsFromLinkedIn = async (searchParams, leadListId, linkedInAccountId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const payload = {
    searchParams,
    leadListId,
    linkedInAccountId,
  };

  const response = await axios.post(
    `${API_URL}/leadlists/${leadListId}/search-linkedin`,
    payload,
    config
  );
  return response.data;
};

// Get leads from specific list
const getLeadsFromList = async (listId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(
    `${API_URL}/leadlists/${listId}/leads`,
    config
  );
  return response.data;
};

// Remove lead from list
const removeLead = async (leadId, listId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.delete(
    `${API_URL}/leadlists/${listId}/leads/${leadId}`,
    config
  );
  return response.data;
};

const leadsService = {
  createLeadList,
  getLeadLists,
  getLeadList,
  deleteLeadList,
  importLeadsFromCSV,
  searchLeadsFromLinkedIn,
  getLeadsFromList,
  removeLead,
};

export default leadsService;