const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
  organizationId?: string;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, organizationId, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (organizationId) headers['x-organization-id'] = organizationId;

  const res = await fetch(`${API_URL}${endpoint}`, { headers, ...rest });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      apiFetch<{ user: { id: string; email: string; name: string }; token: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    me: (token: string) => apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  },
  organizations: {
    list: (token: string) => apiFetch('/organizations', { token }),
    create: (token: string, data: { name: string; slug: string; currency?: string }) =>
      apiFetch('/organizations', { method: 'POST', body: JSON.stringify(data), token }),
  },
  dashboard: {
    metrics: (token: string, organizationId: string) =>
      apiFetch('/dashboard/metrics', { token, organizationId }),
  },
  customers: {
    list: (token: string, organizationId: string) =>
      apiFetch('/customers', { token, organizationId }),
  },
};
