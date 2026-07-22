import { NotificationService } from "./NotificationService";
import { ERROR_NO_CONNECTION } from "src/Constants";
import { ErrorMessages, getHttpErrorMessage } from "src/Utilities/ErrorMessageFormatter";
import { Logger } from "src/Utilities/Logger";

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
  context?: Record<string, unknown>;
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
    error: unknown,
    serviceName: string,
    options: ErrorHandlingOptions = {
      showNotification: true,
      logToConsole: true,
      returnForChat: false,
    }
  ): string {
    const prefix = `[ChatGPT MD] ${serviceName}`;

    // Extract context information if available
    const model = typeof options.context?.model === "string" ? options.context.model : "";
    const url = typeof options.context?.url === "string" ? options.context.url : "";
    const contextInfo = this.formatContextInfo(model, url);

    const userMessage = this.getUserMessage(error);

    const errorMessage = `${prefix}: ${userMessage}${contextInfo ? ` - ${contextInfo}` : ""}`;

    // Log to console if requested
    if (options.logToConsole) {
      Logger.error(`[ChatGPT MD] ${serviceName}`, { error });
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

  private getUserMessage(error: unknown): string {
    if (!error || typeof error !== "object") {
      return typeof error === "string" ? error : "An unexpected error occurred";
    }

    const value = error as {
      name?: unknown;
      message?: unknown;
      status?: unknown;
      error?: { status?: unknown; message?: unknown };
    };
    if (value.name === "AbortError") return "Request was cancelled";
    if (value.message === ERROR_NO_CONNECTION) return ErrorMessages.API.NETWORK_ERROR;

    const status = typeof value.status === "number" ? value.status : value.error?.status;
    if (typeof status === "number" && status >= 400) return this.getStatusMessage(status);
    if (typeof value.error?.message === "string") return value.error.message;
    if (typeof value.message === "string") return value.message;
    return "An unexpected error occurred";
  }

  private getStatusMessage(status: number): string {
    if (status === 401) return ErrorMessages.API.AUTH_FAILED;
    if (status === 404) return ErrorMessages.API.INVALID_MODEL;
    if (status === 429) return ErrorMessages.API.RATE_LIMIT;
    return getHttpErrorMessage(status);
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
}
