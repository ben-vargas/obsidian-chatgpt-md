/**
 * Standardized error message formatting
 * Provides consistent, user-friendly error messages across the application
 */

/**
 * Standard error messages for common scenarios
 */
export const ErrorMessages = {
  API: {
    AUTH_FAILED: "Authentication failed. Please check your API key in settings.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
    RATE_LIMIT: "Rate limit exceeded. Please wait and try again.",
    INVALID_MODEL: "Invalid model selected. Please choose a different model.",
    TIMEOUT: "Request timed out. Please try again.",
    INVALID_RESPONSE: "Invalid response from API. Please try again.",
    CONNECTION_REFUSED: "Connection refused. Please check the API URL in settings.",
  },
};

/**
 * Get user-friendly error message from HTTP status code
 * @param status - HTTP status code
 * @returns User-friendly error message
 */
export function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Bad request. Please check your input and try again.";
    case 401:
      return ErrorMessages.API.AUTH_FAILED;
    case 403:
      return "Access forbidden. Please check your API key and permissions.";
    case 404:
      return "Resource not found. Please check the URL or model name.";
    case 429:
      return ErrorMessages.API.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
      return "Server error. Please try again later.";
    case 504:
      return "Gateway timeout. The request took too long. Please try again.";
    default:
      return `API error (${status}). Please try again.`;
  }
}
