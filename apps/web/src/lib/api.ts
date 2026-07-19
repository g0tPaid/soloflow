import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  CreateQuoteInput,
  UpdateQuoteInput,
  UpdateExpenseCostsInput,
  CreateExpenseInput,
  UpdateOrganizationInput,
} from '@flowbooks/shared';
import { toApiLineItems } from '@/lib/line-items';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

function isHostedAppHost(host: string): boolean {
  return host.includes('railway.app') || host.includes('vercel.app');
}

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLanIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    // Railway, custom domains, etc. — always same-origin proxy (LOCAL_MODE must not override this)
    if (!isLocalHost && !isLanIp) {
      return '/api/v1';
    }

    // Phone on same Wi‑Fi as dev PC
    if (isLanIp) {
      return `http://${host}:3001/api/v1`;
    }
  }

  // Server-side (NextAuth, route handlers): runtime API_URL is authoritative on Railway
  const apiUrl = process.env.API_URL?.replace(/\/$/, '');
  if (apiUrl) return `${apiUrl}/api/v1`;

  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;

  return 'http://localhost:3001/api/v1';
}

function connectionHelpMessage(cause?: string): string {
  if (!LOCAL_MODE) {
    const hint = cause ? ` (${cause})` : '';
    return `Cannot reach SoloFlow API${hint}. In Railway, set web API_URL to your api service URL, then redeploy the web service.`;
  }
  if (typeof window !== 'undefined' && isHostedAppHost(window.location.hostname)) {
    return 'Cannot connect to SoloFlow API. Set web API_URL on Railway and redeploy the web service.';
  }
  return 'Cannot connect to SoloFlow. Close SoloFlow, double-click START-SOLOFLOW.bat on your Desktop, wait for the browser to open, then try again.';
}

function isBrowserHostedApp(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const isLanIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  return !isLocalHost && !isLanIp;
}

async function browserJsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'include', ...init });
  } catch (err) {
    const cause = err instanceof Error ? err.message : undefined;
    throw new Error(connectionHelpMessage(cause));
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
  } catch (err) {
    const cause = err instanceof Error ? err.message : undefined;
    throw new Error(connectionHelpMessage(cause));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || res.statusText;
    if (res.status === 401) {
      throw new Error(
        'Session expired or not signed in. Please sign out and sign in again, then retry.',
      );
    }
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

export type Vendor = Customer;

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
  unitCostCny?: string | number;
  taxRate: string | number;
  amount: string | number;
  costAmount?: string | number;
  product?: Product | null;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId?: string | null;
  vendorId?: string | null;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number;
  /** Invoice VAT percent (5 = 5%). */
  taxRate?: string | number;
  shipping: string | number;
  shippingCost?: string | number;
  shippingCostCny?: string | number;
  discount: string | number;
  total: string | number;
  totalCost?: string | number;
  shippingMethod?: 'AIR' | 'SEA' | 'LOCAL' | null;
  shippingTerms?: 'DDP' | 'LCL' | 'LOCAL' | null;
  shippingFromCountry?: string | null;
  shippingToCountry?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
  vendor?: Vendor | null;
  items?: InvoiceItem[];
}

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONVERTED';

export interface QuoteItem {
  id: string;
  productId?: string | null;
  name?: string | null;
  description: string;
  imageUrl?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  taxRate: string | number;
  amount: string | number;
  product?: Product | null;
}

export interface Quote {
  id: string;
  organizationId: string;
  customerId: string;
  number: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil?: string | null;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number;
  /** Quote VAT percent (5 = 5%). */
  taxRate?: string | number;
  shipping: string | number;
  discount: string | number;
  total: string | number;
  shippingMethod?: 'AIR' | 'SEA' | 'LOCAL' | null;
  shippingTerms?: 'DDP' | 'LCL' | 'LOCAL' | null;
  shippingFromCountry?: string | null;
  shippingToCountry?: string | null;
  notes?: string | null;
  convertedInvoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: QuoteItem[];
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
  customer?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
}

export interface ExpenseDetail extends Invoice {
  revenue: number;
  customerShipping: number;
  shippingCost: number;
  shippingCostCny?: number;
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
  /** Company stamp / authorized signature shown left of invoice totals */
  invoiceSignature?: string;
  /** Up to four 300×300 New Offers images on invoices */
  invoiceOffer1?: string;
  invoiceOffer2?: string;
  invoiceOffer3?: string;
  invoiceOffer4?: string;
  /** Hex accent color for invoice print / PDF (e.g. #DC2626) */
  invoiceAccent?: string;
  /** When true (default), show uploaded company logo on invoices */
  showInvoiceLogo?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role?: string;
  settings?: {
    currency: string;
    costCurrency?: string;
    dashboardCurrency?: string;
    fxEnabled?: boolean;
    timezone: string;
    branding?: OrganizationBranding;
    fxRates?: Record<string, number>;
  };
}

export const api = {
  auth: {
    register: async (data: { name: string; email: string; password: string }) => {
      if (typeof window !== 'undefined') {
        return browserJsonRequest('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    },
    login: (data: { email: string; password: string }) =>
      apiFetch<{ user: { id: string; email: string; name: string; isSuperAdmin?: boolean }; token: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    forgotPassword: async (data: { email: string }) => {
      if (typeof window !== 'undefined') {
        return browserJsonRequest<{ message: string }>('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      return apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    resetPassword: async (data: { token: string; password: string }) => {
      if (typeof window !== 'undefined') {
        return browserJsonRequest<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      return apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    bootstrap: () =>
      apiFetch<{ user: { id: string; email: string; name: string; isSuperAdmin?: boolean }; token: string }>(
        '/auth/bootstrap',
        { method: 'POST', body: JSON.stringify({}) },
      ),
    me: (token: string) =>
      apiFetch<{ id: string; email: string; name: string; isSuperAdmin?: boolean }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
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
    ) => {
      if (isBrowserHostedApp()) {
        return browserJsonRequest<Organization>('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      return apiFetch<Organization>('/organizations', { method: 'POST', body: JSON.stringify(data), token });
    },
    update: (
      token: string,
      organizationId: string,
      id: string,
      data: UpdateOrganizationInput,
    ) => {
      if (isBrowserHostedApp()) {
        return browserJsonRequest<Organization>(`/api/organizations/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': organizationId,
          },
          body: JSON.stringify(data),
        });
      }
      return apiFetch<Organization>(`/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        organizationId,
      });
    },
  },
  dashboard: {
    metrics: (token: string, organizationId: string) =>
      apiFetch<{
        revenue: number;
        expenses: number;
        profit: number;
        outstanding: number;
        cashFlow: number;
        currency: string;
        revenueCny?: number;
        expensesCny?: number;
        profitCny?: number;
        outstandingCny?: number;
        cashFlowCny?: number;
        period: string;
        counts: { customers: number; products: number };
      }>('/dashboard/metrics', { token, organizationId }),
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
  vendors: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<Vendor>>(
        `/vendors${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<Vendor>(`/vendors/${id}`, { token, organizationId }),
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
        address?: Vendor['address'];
      },
    ) =>
      apiFetch<Vendor>('/vendors', {
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
        address?: Vendor['address'];
      }>,
    ) =>
      apiFetch<Vendor>(`/vendors/${id}`, {
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
      const taxRate = Number.isFinite(data.taxRate) ? data.taxRate! : 0;
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
          taxRate,
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
        body: JSON.stringify({
          ...data,
          items: data.items ? toApiLineItems(data.items) : undefined,
        }),
        token,
        organizationId,
      }),
  },
  quotes: {
    list: (token: string, organizationId: string, params?: { page?: number; limit?: number }) =>
      apiFetch<PaginatedResult<Quote>>(
        `/quotes${buildQuery(params)}`,
        { token, organizationId },
      ),
    get: (token: string, organizationId: string, id: string) =>
      apiFetch<Quote>(`/quotes/${id}`, { token, organizationId }),
    nextNumber: (token: string, organizationId: string) =>
      apiFetch<{ number: string }>('/quotes/next-number', { token, organizationId }),
    create: (token: string, organizationId: string, data: CreateQuoteInput) => {
      const discount = Number.isFinite(data.discount) ? data.discount! : 0;
      const shipping = Number.isFinite(data.shipping) ? data.shipping! : 0;
      const taxRate = Number.isFinite(data.taxRate) ? data.taxRate! : 0;
      const validUntil = data.validUntil && data.validUntil !== '' ? data.validUntil : null;

      return apiFetch<Quote>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: data.customerId,
          number: data.number?.trim() || undefined,
          issueDate: data.issueDate,
          validUntil,
          currency: data.currency,
          notes: data.notes || null,
          discount,
          shipping,
          taxRate,
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
    update: (token: string, organizationId: string, id: string, data: UpdateQuoteInput) =>
      apiFetch<Quote>(`/quotes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...data,
          items: data.items ? toApiLineItems(data.items) : undefined,
        }),
        token,
        organizationId,
      }),
    convert: (token: string, organizationId: string, id: string) =>
      apiFetch<{ quote: Quote; invoice: Invoice }>(`/quotes/${id}/convert`, {
        method: 'POST',
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
    create: (token: string, organizationId: string, data: CreateExpenseInput) =>
      apiFetch<ExpenseDetail>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        organizationId,
      }),
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
