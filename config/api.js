// API Configuration
// Update this IP address when your network changes
export const API_BASE_URL = 'https://final-hksamms.onrender.com';

// Helper function to get the API URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

