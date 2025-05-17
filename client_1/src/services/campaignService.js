// src/features/campaign/campaignService.js
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/campaigns`;

// Create new campaign
const createCampaign = async (campaignData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL, campaignData, config);
  return response.data;
};

// Get all campaigns
const getCampaigns = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data;
};

// Get a single campaign
const getCampaignById = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/${campaignId}`, config);
  return response.data;
};

// Update campaign
const updateCampaign = async (campaignId, campaignData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(
    `${API_URL}/${campaignId}`,
    campaignData,
    config
  );
  return response.data;
};

// Delete campaign
const deleteCampaign = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.delete(`${API_URL}/${campaignId}`, config);
  return response.data;
};

// Start campaign
const startCampaign = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${campaignId}/start`,
    {},
    config
  );
  return response.data;
};

// Pause campaign
const pauseCampaign = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${campaignId}/pause`,
    {},
    config
  );
  return response.data;
};

// Stop campaign
const stopCampaign = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${campaignId}/stop`,
    {},
    config
  );
  return response.data;
};

// Add leads to campaign
const addLeadsToCampaign = async (campaignId, leadListIds, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${campaignId}/add-leads`,
    { leadListIds },
    config
  );
  return response.data;
};

// Get campaign actions
const getCampaignActions = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(
    `${API_URL}/${campaignId}/actions`,
    config
  );
  return response.data;
};

// Get campaign action stats
const getCampaignActionStats = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(
    `${API_URL}/${campaignId}/action-stats`,
    config
  );
  return response.data;
};

// Retry failed actions
const retryFailedActions = async (campaignId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${campaignId}/retry-failed-actions`,
    {},
    config
  );
  return response.data;
};
const campaignService = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  addLeadsToCampaign,
  getCampaignActions,
  getCampaignActionStats,
  retryFailedActions
};

export default campaignService;