import type { ClientRequest, IncomingMessage, RequestOptions } from "http";
import type { request as HttpRequest } from "http";
import { Logger } from "src/Utilities/Logger";

type NodeRequest = typeof HttpRequest;
type NodeRequire = (moduleName: "http" | "https") => { request: NodeRequest };

let httpRequest: NodeRequest | undefined;
let httpsRequest: NodeRequest | undefined;
let nodeModulesLoadError: string | undefined;

try {
  const nodeRequire = (globalThis as typeof globalThis & { require?: NodeRequire }).require;
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
    let req: ClientRequest;
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
        reject(error);
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

function createRequestOptions(url: URL, options: RequestStreamParam): RequestOptions {
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
  incoming: IncomingMessage,
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
  response: IncomingMessage,
  redirectCount: number
): RequestStreamParam | null {
  const status = response.statusCode || 0;
  const location = response.headers.location;
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

function createResponse(incoming: IncomingMessage): Response {
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
      incoming.on("data", (chunk: Buffer | Uint8Array) => controller.enqueue(new Uint8Array(chunk)));
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

  return fetch(options.url, {
    method: options.method || "GET",
    headers,
    body: options.body,
    signal: options.signal,
  });
}
