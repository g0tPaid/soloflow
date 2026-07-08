import type { CreateInvoiceInput, UpdateInvoiceInput, UpdateExpenseCostsInput } from '@flowbooks/shared';
import { toApiLineItems } from '@/lib/line-items';

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3001/api/v1`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
}

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

  let res: Response;
  try {
    res = await fetch(`${resolveApiBaseUrl()}${endpoint}`, { headers, ...rest });
  } catch {
    throw new Error(
      'Cannot connect to SoloFlow. Close SoloFlow, double-click START-SOLOFLOW.bat on your Desktop, wait for the browser to open, then try again.',
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || res.statusText;
    throw new Error(message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  currency?: string;
  taxId?: string | null;
  notes?: string | null;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unitPrice: string | number;
  taxRate: string | number;
  currency: string;
  isActive: boolean;
}

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOID';

export interface InvoiceItem {
  id: string;
  productId?: string | null;
  name?: string | null;
  description: string;
  imageUrl?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  unitCost?: string | number;
  taxRate: string | number;
  amount: string | number;
  costAmount?: string | number;
  product?: Product | null;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number;
  shipping: string | number;
  shippingCost?: string | number;
  discount: string | number;
  total: string | number;
  totalCost?: string | number;
  shippingMethod?: 'AIR' | 'SEA' | null;
  shippingTerms?: 'DDP' | 'LCL' | null;
  shippingFromCountry?: string | null;
  shippingToCountry?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface ExpenseSummary {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  revenue: number;
  customerShipping?: number;
  shippingCost?: number;
  totalCost: number;
  profit: number;
  customer?: { id: string; name: string };
}

export interface ExpenseDetail extends Invoice {
  revenue: number;
  customerShipping: number;
  shippingCost: number;
  itemsCost: number;
  totalCost: number;
  shippingProfit: number;
  profit: number;
  marginPercent: number;
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const normalized = { page: 1, ...(params ?? {}) };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

export interface OrganizationBranding {
  tagline?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  instagramUrl?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  /** Promotional banner image shown at the bottom of invoice PDFs */
  invoiceBanner?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role?: string;
  settings?: {
    currency: string;
    timezone: string;
    branding?: OrganizationBranding;
  };
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
    bootstrap: () =>
      apiFetch<{ user: { id: string; email: string; name: string }; token: string }>(
        '/auth/bootstrap',
        { method: 'POST', body: JSON.stringify({}) },
      ),
    me: (token: string) => apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  },
  organizations: {
    list: (token: string) => apiFetch<Organization[]>('/organizations', { token }),
    get: (token: string, id: string) => apiFetch<Organization>(`/organizations/${id}`, { token }),
    create: (
      token: string,
      data: {
        name: string;
        slug: string;
        currency?: string;
        timezone?: string;
        logo?: string | null;
        branding?: OrganizationBranding;
      },
    ) =>
      apiFetch<Organization>('/organizations', { method: 'POST', body: JSON.stringify(data), token }),
    update: (
      token: string,
      organizationId: string,
      id: string,
      data: {
        name?: string;
        logo?: string | null;
        branding?: OrganizationBranding;
      },
    ) =>
      apiFetch<Organization>(`/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
  },
  dashboard: {
    metrics: (token: string, organizationId: string) =>
      apiFetch('/dashboard/metrics', { token, organizationId }),
  },
  customers: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<Customer>>(
        `/customers${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<Customer>(`/customers/${id}`, { token, organizationId }),
    create: (
      token: string,
      organizationId: string,
      data: {
        name: string;
        email?: string | null;
        phone?: string | null;
        currency?: string;
        taxId?: string | null;
        notes?: string | null;
        address?: Customer['address'];
      },
    ) =>
      apiFetch<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
    update: (
      token: string,
      organizationId: string,
      id: string,
      data: Partial<{
        name: string;
        email?: string | null;
        phone?: string | null;
        currency?: string;
        taxId?: string | null;
        notes?: string | null;
        address?: Customer['address'];
      }>,
    ) =>
      apiFetch<Customer>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
  },
  products: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<Product>>(
        `/products${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<Product>(`/products/${id}`, { token, organizationId }),
    create: (
      token: string,
      organizationId: string,
      data: {
        name: string;
        description?: string | null;
        sku?: string | null;
        imageUrl?: string | null;
        unitPrice: number;
        currency?: string;
        taxRate?: number;
      },
    ) =>
      apiFetch<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
    update: (
      token: string,
      organizationId: string,
      id: string,
      data: Partial<{
        name: string;
        description?: string | null;
        sku?: string | null;
        imageUrl?: string | null;
        unitPrice: number;
        currency?: string;
        taxRate?: number;
      }>,
    ) =>
      apiFetch<Product>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
  },
  invoices: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<Invoice>>(
        `/invoices${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<Invoice>(`/invoices/${id}`, { token, organizationId }),
    nextNumber: (token: string, organizationId: string) =>
      apiFetch<{ number: string }>('/invoices/next-number', { token, organizationId }),
    create: (token: string, organizationId: string, data: CreateInvoiceInput) => {
      const discount = Number.isFinite(data.discount) ? data.discount! : 0;
      const shipping = Number.isFinite(data.shipping) ? data.shipping! : 0;
      const dueDate = data.dueDate && data.dueDate !== '' ? data.dueDate : null;

      return apiFetch<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: data.customerId,
          number: data.number?.trim() || undefined,
          issueDate: data.issueDate,
          dueDate,
          currency: data.currency,
          notes: data.notes || null,
          discount,
          shipping,
          shippingMethod: data.shippingMethod ?? null,
          shippingTerms: data.shippingTerms ?? null,
          shippingFromCountry: data.shippingFromCountry?.trim() || null,
          shippingToCountry: data.shippingToCountry?.trim() || null,
          items: toApiLineItems(data.items),
        }),
        token,
        organizationId,
      });
    },
    update: (token: string, organizationId: string, id: string, data: UpdateInvoiceInput) =>
      apiFetch<Invoice>(`/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
  },
  expenses: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<ExpenseSummary>>(
        `/expenses${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<ExpenseDetail>(`/expenses/${id}`, { token, organizationId }),
    updateCosts: (
      token: string,
      organizationId: string,
      id: string,
      data: UpdateExpenseCostsInput,
    ) =>
      apiFetch<ExpenseDetail>(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
  },
};
