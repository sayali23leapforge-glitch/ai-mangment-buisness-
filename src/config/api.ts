/**
 * API Configuration
 * Determines the backend URL based on environment
 * Supports: localhost dev (3001), production (same origin)
 */

const getBackendUrl = (): string => {
  // If env var is explicitly set, use it (takes precedence)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Local development: backend on localhost:3001
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Production: backend served by same Express server (relative URL)
  // Frontend and backend on same origin
  return '';  // Empty string means use relative paths / same origin
};

const API_BASE_URL = getBackendUrl();

export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (API_BASE_URL) {
    // If we have a base URL (dev), prepend it
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // Production: Use relative path (same origin)
  return `/${cleanEndpoint}`;
};

export default API_BASE_URL;


