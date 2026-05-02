// Fetcher universel utilisé par SWR et les mutations.
// Gère les erreurs HTTP de façon cohérente (lit le JSON `{ error, issues }` renvoyé
// par withErrorHandler) et lève une `ApiError` typée que les hooks peuvent inspecter.

export class ApiError extends Error {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issues?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    if (body && typeof body === "object" && "issues" in body) {
      this.issues = body.issues;
    }
  }
}

export async function fetcher<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string")
        ? (body as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

// Helpers pour les mutations (POST/PUT/PATCH/DELETE)
export const api = {
  get: <T = unknown>(url: string) => fetcher<T>(url),
  post: <T = unknown>(url: string, body?: unknown) =>
    fetcher<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(url: string, body?: unknown) =>
    fetcher<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(url: string, body?: unknown) =>
    fetcher<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(url: string) => fetcher<T>(url, { method: "DELETE" }),
};
