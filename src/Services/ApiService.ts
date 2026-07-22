import { requestUrl } from "obsidian";
import { requestStream } from "./requestStream";
import { Logger } from "src/Utilities/Logger";
/**
 * ApiService handles all API communication for the application
 * It centralizes request logic, error handling, and response processing
 */
export class ApiService {
  private abortController: AbortController | null = null;
  private wasStreamingAborted: boolean = false;

  /**
   * Make a GET request to fetch data
   * @param url The API endpoint URL
   * @param headers The request headers
   * @param serviceType The AI service type (openai, openrouter, ollama)
   * @returns The parsed response data
   */
  async makeGetRequest(url: string, headers: Record<string, string>, _serviceType: string): Promise<unknown> {
    const responseObj = await requestUrl({
      url,
      method: "GET",
      headers,
      throw: false,
    });

    if (responseObj.status !== 200) {
      throw new Error(`Failed to fetch data from ${url}: ${responseObj.status}`);
    }

    return responseObj.json;
  }

  /**
   * Set the abort controller for external streaming implementations
   * This allows AI SDK streaming to use the same abort mechanism
   */
  setAbortController(controller: AbortController): void {
    this.abortController = controller;
    this.wasStreamingAborted = false;
  }

  /**
   * Stop any ongoing streaming request
   */
  stopStreaming(): void {
    if (this.abortController) {
      this.wasStreamingAborted = true;
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if streaming was aborted
   */
  wasAborted(): boolean {
    return this.wasStreamingAborted;
  }

  /**
   * Create a fetch-compatible function that uses requestStream
   * This allows third-party libraries (like AI SDK) to use Obsidian's requestUrl under the hood
   * @returns A fetch-compatible function
   */
  createFetchAdapter(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = this.resolveUrl(input);

      Logger.debug(`[ChatGPT MD] Fetch adapter CALLED`, {
        url,
        method: init?.method || "GET",
        hasBody: !!init?.body,
        hasSignal: !!init?.signal,
      });

      const requestOptions = {
        url,
        method: init?.method || "GET",
        headers: this.normalizeHeaders(init?.headers),
        body: this.normalizeBody(init?.body),
        signal: init?.signal || undefined,
      };

      Logger.debug(`[ChatGPT MD] Calling requestStream with options:`, {
        url: requestOptions.url,
        method: requestOptions.method,
        hasBody: !!requestOptions.body,
      });

      try {
        const response = await requestStream(requestOptions);
        Logger.debug(`[ChatGPT MD] requestStream returned response:`, {
          status: response.status,
          ok: response.ok,
        });
        return response;
      } catch (error: unknown) {
        Logger.error("[ChatGPT MD] Streaming request failed", { error, url });
        throw error;
      }
    };
  }

  private resolveUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") return input;
    return input instanceof URL ? input.toString() : input.url;
  }

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    const result: Record<string, string> = {};
    new Headers(headers).forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private normalizeBody(body?: BodyInit | null): string | undefined {
    if (body === undefined || body === null) return undefined;
    if (typeof body === "string") return body;
    if (body instanceof URLSearchParams) return body.toString();
    throw new TypeError("Unsupported streaming request body type");
  }
}
