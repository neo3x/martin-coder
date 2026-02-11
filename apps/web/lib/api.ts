const ACCESS_TOKEN_KEY = "martin-coder-access-token";
const REFRESH_TOKEN_KEY = "martin-coder-refresh-token";

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
})();

function normalizeSuffix(path: string): string {
  const cleaned = path.startsWith("/") ? path : `/${path}`;

  if (cleaned === "/api" || cleaned === "/api/v1") return "";
  if (cleaned.startsWith("/api/v1/")) return cleaned.slice(7);
  if (cleaned.startsWith("/api/")) return cleaned.slice(4);
  return cleaned;
}

function buildUrl(path: string): string {
  const suffix = normalizeSuffix(path);

  if (!API_BASE) {
    return `/api${suffix}`;
  }

  // Avoid duplicated /api/v1 when NEXT_PUBLIC_API_URL already points there
  if (API_BASE.endsWith("/api/v1")) {
    return `${API_BASE}${suffix}`;
  }

  return `${API_BASE}/api/v1${suffix}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestInitWithBody = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, init: RequestInitWithBody = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      throw new ApiError(payload.detail || fallback, response.status);
    } catch {
      throw new ApiError(fallback, response.status);
    }
  }

  // 204 / empty body support
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  request,
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PATCH", body }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),

  async stream(
    path: string,
    body: unknown,
    handlers: {
      onEvent: (event: Record<string, unknown>) => void;
      onDone?: () => void;
    }
  ): Promise<void> {
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const fallback = `Stream request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { detail?: string };
        throw new ApiError(payload.detail || fallback, response.status);
      } catch {
        throw new ApiError(fallback, response.status);
      }
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const line = rawEvent
          .split("\n")
          .find((candidate) => candidate.startsWith("data:"));
        if (!line) continue;

        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") {
          finished = true;
          handlers.onDone?.();
          continue;
        }

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          handlers.onEvent(parsed);
        } catch {
          // Ignore malformed chunks
        }
      }
    }

    if (!finished) {
      handlers.onDone?.();
    }
  },

  storage: {
    get accessToken() {
      return typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    },
    get refreshToken() {
      return typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    },
    setTokens(accessToken: string, refreshToken: string) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clearTokens() {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
  },
};
