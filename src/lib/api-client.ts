export class ApiException extends Error {
  public status: number;
  public data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response?.headers?.get ? response.headers.get("content-type") : null;
  const isJson = !contentType || contentType.includes("application/json");

  let responseData: unknown = null;
  if (isJson) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (responseData && typeof responseData === "object" && "error" in responseData) {
      message = String((responseData as { error: unknown }).error) || message;
    } else if (responseData && typeof responseData === "object" && "message" in responseData) {
      message = String((responseData as { message: unknown }).message) || message;
    }
    throw new ApiException(message, response.status, responseData);
  }

  return responseData as T;
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return endpoint;

  const url = new URL(endpoint, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  // Preserve relative path formatting
  return endpoint.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    return request<T>(url, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    return request<T>(url, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    return request<T>(url, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    return request<T>(url, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    return request<T>(url, { ...options, method: "DELETE" });
  },
};
