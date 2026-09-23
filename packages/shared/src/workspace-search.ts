export const WORKSPACE_SEARCH_MIN_QUERY_LENGTH = 2;
export const WORKSPACE_SEARCH_RESULT_LIMIT = 8;
export const WORKSPACE_SEARCH_MAX_QUERY_LENGTH = 80;

export type WorkspaceSearchKind = 'customer' | 'invoice';

/**
 * Trim and cap a workspace search query.
 * Returns null when there is nothing useful to search yet.
 */
export function normalizeWorkspaceSearchQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const query = raw.trim().replace(/\s+/g, ' ');
  if (query.length < WORKSPACE_SEARCH_MIN_QUERY_LENGTH) return null;
  return query.slice(0, WORKSPACE_SEARCH_MAX_QUERY_LENGTH);
}

function containsFold(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

/**
 * Customer name is the person or company (there is no separate company column).
 * Email and phone are the other fields people type when looking someone up.
 */
export function customerMatchesWorkspaceSearch(
  customer: { name?: string | null; email?: string | null; phone?: string | null },
  rawQuery: unknown,
): boolean {
  const query = normalizeWorkspaceSearchQuery(rawQuery);
  if (!query) return false;
  return (
    containsFold(customer.name, query) ||
    containsFold(customer.email, query) ||
    containsFold(customer.phone, query)
  );
}

/** Invoice number, or the customer name/email on that invoice. */
export function invoiceMatchesWorkspaceSearch(
  invoice: {
    number?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
  },
  rawQuery: unknown,
): boolean {
  const query = normalizeWorkspaceSearchQuery(rawQuery);
  if (!query) return false;
  return (
    containsFold(invoice.number, query) ||
    containsFold(invoice.customerName, query) ||
    containsFold(invoice.customerEmail, query)
  );
}

export function workspaceSearchHref(kind: WorkspaceSearchKind, id: string): string {
  return kind === 'customer' ? `/customers/${id}` : `/invoices/${id}`;
}

export function workspaceSearchSubtitle(input: {
  kind: WorkspaceSearchKind;
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
  status?: string | null;
}): string {
  if (input.kind === 'customer') {
    return input.email?.trim() || input.phone?.trim() || 'Customer';
  }
  const who = input.customerName?.trim() || 'No customer';
  const status = input.status?.trim();
  return status ? `${who} · ${status.toLowerCase()}` : who;
}
