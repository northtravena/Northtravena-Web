// src/lib/api.ts — Centralized fetch wrapper with auth token management

const BASE = import.meta.env.PROD
  ? "https://api.northtravena.com/api/v1"
  : "/api/v1";


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
  let json: { success: boolean; message?: string; data?: unknown } | null = null;
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
    throw new Error(json?.message ?? "Unauthorized");
  }

  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Request failed with status ${res.status}`);
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
