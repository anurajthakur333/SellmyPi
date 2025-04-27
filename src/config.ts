/**
 * Application Configuration
 * 
 * This file manages environment-specific settings like API URLs.
 * It reads from environment variables but provides fallbacks.
 */

// Base API URL - Environment variable with fallback
// In production, this should be set to your actual API domain
export const API_URL = import.meta.env.VITE_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://api.sellmypi.com' // Replace with your actual production API URL
    : 'http://localhost:3000');

/**
 * Get full API endpoint URL
 * @param path - API endpoint path (without leading slash)
 * @returns Full API URL
 */
export const getApiUrl = (path: string): string => {
  return `${API_URL}/api/${path}`;
};

// Export other configuration variables as needed
export const APP_VERSION = '1.0.0'; 