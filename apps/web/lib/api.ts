export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function apiUrl(path: string): string {
  const normalized = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
  // Browser: same-origin via Next.js rewrite so HTTP-only cookies stick to localhost:3000
  if (typeof window !== 'undefined') {
    return normalized;
  }
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${base}${normalized}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new ApiClientError(
      json?.error?.code || 'REQUEST_FAILED',
      json?.error?.message || res.statusText || 'Request failed',
      json?.error?.details,
    );
  }
  return (json.data !== undefined ? json.data : json) as T;
}
