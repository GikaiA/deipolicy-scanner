import axios from 'axios';

// No need to specify the full URL as we're using Vite's proxy in development
// and the API is served from the same origin in production
const API_BASE = '/api';

export const searchDEIPolicies = async (url) => {
  try {
    const response = await axios.post(`${API_BASE}/search`, { url });
    return response.data;
  } catch (error) {
    console.error('Error fetching DEI policies:', error);
    throw new Error(error.response?.data?.error || 'Failed to search DEI policies');
  }
};