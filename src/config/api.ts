/**
 * API Configuration
 * Determines the backend URL based on environment
 */

// Get the API base URL from environment variable, or construct it intelligently
const getBackendUrl = (): string => {
  // If env var is set, use it (for Render/production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // For local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // For production on Render - try common patterns
  const hostname = window.location.hostname;
  
  // If frontend is on nayance.com, backend is probably on api.nayance.com
  if (hostname.includes('nayance.com')) {
    return `https://api.${hostname}`;
  }

  // If frontend is on Render, backend is probably on same domain with different port or path
  if (hostname.includes('onrender.com')) {
    // Try replacing frontend-name with backend-name
    // e.g., ai-mangment-buisness.onrender.com -> ai-mangment-buisness-api.onrender.com
    const backendHostname = hostname.replace('ai-mangment-buisness', 'ai-mangment-buisness-api');
    if (backendHostname !== hostname) {
      return `https://${backendHostname}`;
    }
    
    // Or it might be the same service on a different port
    return `https://${hostname}:3001`;
  }

  // Fallback
  return `https://${hostname}`;
};

const API_BASE_URL = getBackendUrl();

export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_BASE_URL;

