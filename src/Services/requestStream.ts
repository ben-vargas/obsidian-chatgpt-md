import { Logger } from "src/Utilities/Logger";

/**
 * Minimal structural types for the Node http/https modules loaded at runtime
 * via guarded window.require (desktop only). Declared locally so no static
 * Node.js imports ship in the mobile bundle.
 */
interface NodeRequestOptions {
  hostname: string;
  port: number | string;
  path: string;
  method?: string;
  headers?: Record<string, string>;
}

interface NodeIncomingMessage {
  headers: Record<string, string | string[] | undefined>;
  statusCode?: number;
  statusMessage?: string;
  on(event: "data", listener: (chunk: Uint8Array) => void): void;
  once(event: "end", listener: () => void): void;
  once(event: "error", listener: (error: Error) => void): void;
  resume(): void;
  destroy(): void;
}

interface NodeClientRequest {
  write(data: string): void;
  end(): void;
  destroy(): void;
  once(event: "error", listener: (error: Error) => void): void;
}

type NodeRequest = (
  options: NodeRequestOptions,
  callback: (incoming: NodeIncomingMessage) => void
) => NodeClientRequest;
type NodeRequire = (moduleName: "http" | "https") => { request: NodeRequest };

let httpRequest: NodeRequest | undefined;
let httpsRequest: NodeRequest | undefined;
let nodeModulesLoadError: string | undefined;

try {
  const nodeRequire = (window as Window & { require?: NodeRequire }).require;
  if (nodeRequire) {
    httpRequest = nodeRequire("http").request;
    httpsRequest = nodeRequire("https").request;
  } else {
    nodeModulesLoadError = "globalThis.require is undefined";
  }
} catch (error) {
  nodeModulesLoadError = error instanceof Error ? error.message : String(error);
}

Logger.debug("[ChatGPT MD] request transport initialized", {
  nodeModulesAvailable: Boolean(httpRequest && httpsRequest),
  error: nodeModulesLoadError,
});

export interface RequestStreamParam {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Use Node HTTP on desktop to bypass CORS, with standards-based fetch on mobile. */
export function requestStream(options: RequestStreamParam): Promise<Response> {
  return httpRequest && httpsRequest
    ? requestStreamNodeHttp(options, httpRequest, httpsRequest)
    : requestStreamFetch(options);
}

export function requestStreamNodeHttp(
  options: RequestStreamParam,
  http: NodeRequest,
  https: NodeRequest,
  redirectCount = 0
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const request = url.protocol === "https:" ? https : http;
    const requestOptions = createRequestOptions(url, options);

    let settled = false;
    let req: NodeClientRequest | undefined;
    const abort = (): void => {
      req?.destroy();
      if (!settled) {
        settled = true;
        reject(new DOMException("Request aborted", "AbortError"));
      }
    };

    if (options.signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    req = request(requestOptions, (incoming) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      try {
        resolve(resolveIncomingResponse(options, incoming, http, https, redirectCount));
      } catch (error) {
        incoming.destroy();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    options.signal?.addEventListener("abort", abort, { once: true });
    req.once("error", (error) => {
      options.signal?.removeEventListener("abort", abort);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

function createRequestOptions(url: URL, options: RequestStreamParam): NodeRequestOptions {
  return {
    hostname: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...options.headers },
  };
}

function resolveIncomingResponse(
  options: RequestStreamParam,
  incoming: NodeIncomingMessage,
  http: NodeRequest,
  https: NodeRequest,
  redirectCount: number
): Response | Promise<Response> {
  const redirect = getRedirectOptions(options, incoming, redirectCount);
  if (!redirect) return createResponse(incoming);

  incoming.resume();
  return requestStreamNodeHttp(redirect, http, https, redirectCount + 1);
}

function getRedirectOptions(
  options: RequestStreamParam,
  response: NodeIncomingMessage,
  redirectCount: number
): RequestStreamParam | null {
  const status = response.statusCode || 0;
  const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
  if (![301, 302, 303, 307, 308].includes(status) || !location) return null;
  if (redirectCount >= 5) throw new Error("Too many redirects");

  const source = new URL(options.url);
  const target = new URL(location, source);
  const headers = { ...options.headers };
  if (target.origin !== source.origin) {
    for (const key of Object.keys(headers)) {
      if (/authorization|api[-_]?key|token/i.test(key)) delete headers[key];
    }
  }

  const switchToGet = status === 303 || ((status === 301 || status === 302) && options.method === "POST");
  return {
    ...options,
    url: target.toString(),
    method: switchToGet ? "GET" : options.method,
    body: switchToGet ? undefined : options.body,
    headers,
  };
}

function createResponse(incoming: NodeIncomingMessage): Response {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  const status = incoming.statusCode || 500;
  if (status === 204 || status === 205 || status === 304) {
    incoming.resume();
    return new Response(null, { status, statusText: incoming.statusMessage || "", headers });
  }

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      incoming.on("data", (chunk: Uint8Array) => controller.enqueue(new Uint8Array(chunk)));
      incoming.once("end", () => controller.close());
      incoming.once("error", (error) => controller.error(error));
    },
    cancel() {
      incoming.destroy();
    },
  });

  return new Response(body, {
    status,
    statusText: incoming.statusMessage || "",
    headers,
  });
}

export function requestStreamFetch(options: RequestStreamParam): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  // window.fetch instead of bare fetch (obsidianmd/no-restricted-globals):
  // requestUrl cannot stream, and the mobile fallback path requires SSE
  // streaming. Scoped to window for popout-window compatibility.
  return window.fetch(options.url, {
    method: options.method || "GET",
    headers,
    body: options.body,
    signal: options.signal,
  });
}
