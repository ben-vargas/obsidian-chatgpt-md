import { NotificationService } from "./NotificationService";
import { ERROR_NO_CONNECTION } from "src/Constants";
import { ErrorMessages, formatErrorForLogging, getHttpErrorMessage } from "src/Utilities/ErrorMessageFormatter";

/**
 * Error types that can be handled by the ErrorService
 */
export enum ErrorType {
  API_ERROR = "api_error",
  NETWORK_ERROR = "network_error",
  AUTHENTICATION_ERROR = "authentication_error",
  NOT_FOUND_ERROR = "not_found_error",
  VALIDATION_ERROR = "validation_error",
  UNKNOWN_ERROR = "unknown_error",
  STREAM_ABORTED = "stream_aborted",
}

/**
 * Options for error handling
 */
export interface ErrorHandlingOptions {
  /** Whether to show a notification */
  showNotification?: boolean;
  /** Whether to log to console */
  logToConsole?: boolean;
  /** Whether to return a user-friendly message for chat */
  returnForChat?: boolean;
  /** Additional context for the error */
  context?: Record<string, any>;
}

/**
 * Service for centralized error handling
 */
export class ErrorService {
  constructor(private notificationService: NotificationService) {}

  /**
   * Handle API errors from any service
   */
  handleApiError(
    error: any,
    serviceName: string,
    options: ErrorHandlingOptions = {
      showNotification: true,
      logToConsole: true,
      returnForChat: false,
    }
  ): string {
    const prefix = `[ChatGPT MD] ${serviceName}`;

    // Extract context information if available
    const model = options.context?.model || "";
    const url = options.context?.url || "";
    const contextInfo = this.formatContextInfo(model, url);

    const userMessage = this.getUserMessage(error);

    const errorMessage = `${prefix}: ${userMessage}${contextInfo ? ` - ${contextInfo}` : ""}`;

    // Log to console if requested
    if (options.logToConsole) {
      console.error(formatErrorForLogging(error, serviceName));
    }

    // Show notification if requested
    if (options.showNotification) {
      this.notificationService.showNotification(errorMessage, 5000);
    }

    // Return message for chat if requested
    if (options.returnForChat) {
      return `I am sorry, I could not answer your request because of an error, here is what went wrong-

${userMessage}

Model- ${model}, URL- ${url}`;
    }

    // Throw error for caller to handle
    throw new Error(errorMessage);
  }

  private getUserMessage(error: any): string {
    if (!(error instanceof Object)) return typeof error === "string" ? error : "An unexpected error occurred";
    if (error.name === "AbortError") return "Request was cancelled";
    if (error.message === ERROR_NO_CONNECTION) return ErrorMessages.API.NETWORK_ERROR;

    const status = error.status || error.error?.status;
    if (status === 401) return ErrorMessages.API.AUTH_FAILED;
    if (status === 404) return ErrorMessages.API.INVALID_MODEL;
    if (status === 429) return ErrorMessages.API.RATE_LIMIT;
    if (status >= 400) return getHttpErrorMessage(status);
    if (error.error?.message) return error.error.message;
    if (error.message) return error.message;
    return "An unexpected error occurred";
  }

  /**
   * Format context information for error messages
   */
  private formatContextInfo(model: string, url: string): string {
    const parts = [];
    if (model) parts.push(`Model: ${model}`);
    if (url) {
      // Ensure URL is displayed correctly without replacing special characters
      parts.push(`URL: ${url}`);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  }

  /**
   * Handle URL configuration errors
   */
  handleUrlError(url: string, defaultUrl: string, serviceName: string): string {
    const userMessage = ErrorMessages.API.CONNECTION_REFUSED;
    const errorMessage = `[ChatGPT MD] ${userMessage} (${url})`;

    this.notificationService.showNotification(errorMessage);
    console.error(`[ChatGPT MD] URL configuration error`, { url, defaultUrl, serviceName });

    return `I am sorry, I could not answer your request because of an error, here is what went wrong-

${userMessage}

Please check your API URL settings.`;
  }

  /**
   * Handle model configuration errors
   */
  handleModelError(model: string, serviceName: string): string {
    const userMessage = ErrorMessages.SETTINGS.MISSING_MODEL;
    const errorMessage = `[ChatGPT MD] ${userMessage}`;

    this.notificationService.showNotification(errorMessage);
    console.error(`[ChatGPT MD] Model configuration error`, { model, serviceName });

    return `I am sorry, there was an error with the model configuration. ${userMessage}`;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(message: string, context?: Record<string, any>): never {
    const errorMessage = `[ChatGPT MD] Validation Error: ${message}`;

    this.notificationService.showNotification(errorMessage);
    console.error(`[ChatGPT MD] Validation error`, { message, context });

    throw new Error(errorMessage);
  }
}
