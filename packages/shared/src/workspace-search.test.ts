import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_SEARCH_MAX_QUERY_LENGTH,
  customerMatchesWorkspaceSearch,
  invoiceMatchesWorkspaceSearch,
  normalizeWorkspaceSearchQuery,
  workspaceSearchHref,
  workspaceSearchSubtitle,
} from './workspace-search';

describe('workspace search', () => {
  it('ignores blank and one-character queries', () => {
    expect(normalizeWorkspaceSearchQuery('  ')).toBeNull();
    expect(normalizeWorkspaceSearchQuery('a')).toBeNull();
    expect(normalizeWorkspaceSearchQuery(12)).toBeNull();
    expect(normalizeWorkspaceSearchQuery('  ac me  ')).toBe('ac me');
  });

  it('caps very long queries', () => {
    const query = normalizeWorkspaceSearchQuery('x'.repeat(WORKSPACE_SEARCH_MAX_QUERY_LENGTH + 20));
    expect(query).toHaveLength(WORKSPACE_SEARCH_MAX_QUERY_LENGTH);
  });

  it('matches customers by name, email, or phone', () => {
    const customer = { name: 'Acme Corp', email: 'billing@acme.com', phone: '+971500000' };
    expect(customerMatchesWorkspaceSearch(customer, 'acme')).toBe(true);
    expect(customerMatchesWorkspaceSearch(customer, 'BILLING@')).toBe(true);
    expect(customerMatchesWorkspaceSearch(customer, '9715')).toBe(true);
    expect(customerMatchesWorkspaceSearch(customer, 'other')).toBe(false);
    expect(customerMatchesWorkspaceSearch(customer, 'a')).toBe(false);
  });

  it('matches invoices by number or the customer on the invoice', () => {
    const invoice = { number: 'INV-1042', customerName: 'Acme Corp', customerEmail: 'billing@acme.com' };
    expect(invoiceMatchesWorkspaceSearch(invoice, '1042')).toBe(true);
    expect(invoiceMatchesWorkspaceSearch(invoice, 'inv-1042')).toBe(true);
    expect(invoiceMatchesWorkspaceSearch(invoice, 'acme corp')).toBe(true);
    expect(invoiceMatchesWorkspaceSearch(invoice, 'billing@acme')).toBe(true);
    expect(invoiceMatchesWorkspaceSearch({ number: 'INV-9' }, 'acme')).toBe(false);
  });

  it('builds detail links and compact subtitles', () => {
    expect(workspaceSearchHref('customer', 'cus_1')).toBe('/customers/cus_1');
    expect(workspaceSearchHref('invoice', 'inv_1')).toBe('/invoices/inv_1');
    expect(workspaceSearchSubtitle({ kind: 'customer', email: 'a@b.co', phone: '1' })).toBe('a@b.co');
    expect(workspaceSearchSubtitle({ kind: 'customer', phone: '555' })).toBe('555');
    expect(workspaceSearchSubtitle({ kind: 'customer' })).toBe('Customer');
    expect(
      workspaceSearchSubtitle({ kind: 'invoice', customerName: 'Acme Corp', status: 'SENT' }),
    ).toBe('Acme Corp · sent');
    expect(workspaceSearchSubtitle({ kind: 'invoice' })).toBe('No customer');
  });
});
