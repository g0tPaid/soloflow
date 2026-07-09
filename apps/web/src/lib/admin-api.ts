import { apiFetch, type PaginatedResult } from '@/lib/api';

function buildQuery(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : '';
}

export type AdminOverview = {
  totals: {
    users: number;
    newUsersToday: number;
    activeUsersToday: number;
    companies: number;
    invoices: number;
    expenses: number;
    receipts: number;
    customers: number;
    products: number;
    totalInvoiceAmount: number;
    totalExpenseAmount: number;
    outstandingAmount: number;
    profit: number;
  };
  latest: {
    signups: { id: string; name: string | null; email: string; company: string; createdAt: string }[];
    invoices: AdminInvoiceRow[];
    expenses: AdminExpenseRow[];
    receipts: AdminReceiptRow[];
  };
  charts: {
    userRegistrations: { date: string; count: number }[];
    invoicesCreated: { date: string; count: number }[];
    expensesCreated: { date: string; count: number }[];
  };
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  joinedDate: string;
  lastActive: string;
  status: 'active' | 'suspended';
  isSuperAdmin: boolean;
};

export type AdminInvoiceRow = {
  id: string;
  number: string;
  company: string;
  customer: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  createdAt: string;
};

export type AdminExpenseRow = {
  id: string;
  user: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  company: string;
  number: string;
};

export type AdminReceiptRow = {
  id: string;
  number: string;
  imageUrl: string | null;
  user: string;
  userId?: string;
  company: string;
  date: string;
  ocrStatus: string;
};

export const adminApi = {
  overview: (token: string) => apiFetch<AdminOverview>('/admin/overview', { token }),

  users: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<AdminUserRow>>(`/admin/users${buildQuery(params)}`, { token }),

  user: (token: string, id: string) => apiFetch(`/admin/users/${id}`, { token }),

  suspendUser: (token: string, id: string) =>
    apiFetch(`/admin/users/${id}/suspend`, { method: 'POST', token }),

  activateUser: (token: string, id: string) =>
    apiFetch(`/admin/users/${id}/activate`, { method: 'POST', token }),

  deleteUser: (token: string, id: string) =>
    apiFetch(`/admin/users/${id}`, { method: 'DELETE', token }),

  invoices: (
    token: string,
    params?: { page?: number; search?: string; status?: string; userId?: string; from?: string; to?: string },
  ) => apiFetch<PaginatedResult<AdminInvoiceRow>>(`/admin/invoices${buildQuery(params)}`, { token }),

  expenses: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<AdminExpenseRow>>(`/admin/expenses${buildQuery(params)}`, { token }),

  receipts: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<AdminReceiptRow>>(`/admin/receipts${buildQuery(params)}`, { token }),

  customers: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<Record<string, unknown>>>(`/admin/customers${buildQuery(params)}`, { token }),

  products: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<Record<string, unknown>>>(`/admin/products${buildQuery(params)}`, { token }),

  companies: (token: string, params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResult<Record<string, unknown>>>(`/admin/companies${buildQuery(params)}`, { token }),

  search: (token: string, q: string) =>
    apiFetch<{
      users: { id: string; label: string; sub: string; href: string }[];
      companies: { id: string; label: string; sub: string; href: string }[];
      invoices: { id: string; label: string; sub: string; href: string }[];
      expenses: { id: string; label: string; sub: string; href: string }[];
      customers: { id: string; label: string; sub: string; href: string }[];
      products: { id: string; label: string; sub: string; href: string }[];
    }>(`/admin/search${buildQuery({ q })}`, { token }),
};
