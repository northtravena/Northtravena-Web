// src/lib/api.ts — Centralized fetch wrapper with auth token management

const BASE = import.meta.env.PROD
  ? "https://api.northtravena.com/api/v1"
  : "/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("nt_token");

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (networkErr) {
    throw new Error("Cannot reach the server. Make sure the backend is running.");
  }

  // Try to parse JSON — guard against empty bodies (204, network cut, etc.)
  let json: ApiResponse<unknown> | null = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Server returned invalid response (status ${res.status})`);
    }
  }

  // Handle 401 — clear credentials but do NOT redirect (SPA handles routing via state)
  if (res.status === 401) {
    localStorage.removeItem("nt_token");
    localStorage.removeItem("nt_user");
    throw new Error(json?.data as string ?? "Unauthorized");
  }

  if (!res.ok || !json?.success) {
    throw new Error((json?.data as string) ?? `Request failed with status ${res.status}`);
  }

  // If the response includes pagination metadata, return the full wrapper
  // so paginated hooks can access both data and pagination info
  if (json.pagination) {
    return json as unknown as T;
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
