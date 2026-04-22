/**
 * API Configuration
 * Determines the backend URL based on environment
 * Supports: localhost dev (3001), production (same origin)
 */


// Returns the backend API base URL
const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isProduction = !isLocalhost;

  if (envUrl) {
    return envUrl;
  }

  if (isLocalhost) {
    // Local dev fallback
    return 'http://localhost:3001';
  }

  // PRODUCTION: Never allow fallback to frontend domain
  throw new Error('[CONFIG ERROR] VITE_API_URL is not set in production! All API calls will fail. Please set VITE_API_URL to your backend endpoint.');
};

const API_BASE_URL = getBackendUrl();

// Returns the full API URL for a given endpoint
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL.replace(/\/$/, '')}/${cleanEndpoint}`;
};

export default API_BASE_URL;


