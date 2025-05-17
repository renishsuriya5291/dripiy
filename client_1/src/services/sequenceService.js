// src/services/sequenceService.js
import axios from 'axios';
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/sequences';

// Create new sequence
const createSequence = async (sequenceData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL, sequenceData, config);
  return response.data;
};

// Get all sequences
const getSequences = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data;
};

// Get sequence by ID
const getSequenceById = async (sequenceId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/${sequenceId}`, config);
  return response.data;
};

// Update sequence
const updateSequence = async (sequenceId, sequenceData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(
    `${API_URL}/${sequenceId}`,
    sequenceData,
    config
  );
  return response.data;
};

// Delete sequence
const deleteSequence = async (sequenceId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.delete(`${API_URL}/${sequenceId}`, config);
  return response.data;
};

// Save flow elements
const saveFlowElements = async (sequenceId, flowData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Convert flow data to sequence nodes and edges format
  const sequenceData = {
    nodes: flowData.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data
    })),
    edges: flowData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label
    }))
  };

  const response = await axios.post(
    `${API_URL}/${sequenceId}/flow`,
    sequenceData,
    config
  );
  return response.data;
};

// Clone sequence
const cloneSequence = async (sequenceId, name, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    `${API_URL}/${sequenceId}/clone`,
    { name },
    config
  );
  return response.data;
};

// Get template sequences
const getTemplateSequences = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/templates`, config);
  return response.data;
};

const sequenceService = {
  createSequence,
  getSequences,
  getSequenceById,
  updateSequence,
  deleteSequence,
  saveFlowElements,
  cloneSequence,
  getTemplateSequences,
};

export default sequenceService;